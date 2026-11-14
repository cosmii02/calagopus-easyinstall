use crate::game::Game;
use axum::http::StatusCode;
use serde::Serialize;
use shared::{
    State,
    models::{
        ByUuid, UpdatableModel,
        nest_egg::NestEgg,
        nest_egg_variable::NestEggVariable,
        server::{Server, ServerInstallOptions, UpdateServerOptions},
        server_variable::ServerVariable,
    },
    response::ApiResponse,
};
use utoipa::ToSchema;

pub struct InstallPlan {
    pub game: Game,
    pub egg: NestEgg,
    pub software: compact_str::CompactString,
    pub version: compact_str::CompactString,
    pub java: Option<u16>,
    /// The exact MCJars build (Java only: a Bedrock version already names one release, Hytale
    /// always gets the newest build of its patchline).
    pub build: Option<crate::mcjars::Build>,
    pub image: compact_str::CompactString,
    pub startup: compact_str::CompactString,
}

impl InstallPlan {
    /// The egg variables the install sets, everything else keeps its value.
    fn variables(&self) -> Vec<(&'static str, compact_str::CompactString)> {
        match self.game {
            Game::Java => {
                let mut variables = vec![
                    ("SOFTWARE", self.software.clone()),
                    ("VERSION", self.version.clone()),
                ];
                if let Some(build) = &self.build {
                    variables.push(("BUILD", compact_str::format_compact!("{}", build.id)));
                }
                variables
            }
            Game::Bedrock => vec![("BEDROCK_VERSION", self.version.clone())],
            Game::Hytale => vec![("HYTALE_PATCHLINE", self.version.clone())],
        }
    }
}

pub fn bad_request(message: impl AsRef<str>) -> ApiResponse {
    ApiResponse::error(message.as_ref()).with_status(StatusCode::BAD_REQUEST)
}

pub fn upstream_error(err: anyhow::Error) -> ApiResponse {
    tracing::warn!("version lookup failed: {err:#}");
    ApiResponse::error("failed to fetch version information").with_status(StatusCode::BAD_GATEWAY)
}

/// The egg's image for exactly this Java version, else the closest newer one.
fn pick_java_image(egg: &NestEgg, java: u16) -> Option<compact_str::CompactString> {
    egg.docker_images
        .iter()
        .filter_map(|(name, image)| {
            let version: u16 = name.trim().strip_prefix("Java")?.trim().parse().ok()?;
            (version >= java).then_some((version, image))
        })
        .min_by_key(|(version, _)| *version)
        .map(|(_, image)| image.clone())
}

/// Validates the request and resolves everything an install needs, without changing anything.
pub async fn plan(
    state: &State,
    software: &str,
    version: &str,
) -> Result<InstallPlan, ApiResponse> {
    let Some(game) = Game::from_software(software) else {
        return Err(bad_request("unsupported server type"));
    };

    let Some(egg_uuid) = game.egg_uuid(state).await? else {
        return Err(bad_request(format!(
            "EasyInstall has not been set up for {} by an administrator yet",
            game.name()
        )));
    };
    let Some(egg) = NestEgg::by_uuid_optional(&state.database, egg_uuid).await? else {
        return Err(bad_request(format!(
            "the egg configured for {} no longer exists",
            game.name()
        )));
    };

    let versions = crate::game::versions(state, game, software)
        .await
        .map_err(upstream_error)?;
    let Some(version) = versions.into_iter().find(|v| v.version == version) else {
        return Err(bad_request("unknown version for this server type"));
    };

    let (build, image) = match version.java {
        Some(java) => {
            let build = crate::mcjars::latest_build(state, software, &version.version)
                .await
                .map_err(upstream_error)?;
            let Some(image) = pick_java_image(&egg, java) else {
                return Err(bad_request(format!(
                    "the configured egg has no Java {java} (or newer) image"
                )));
            };
            (Some(build), image)
        }
        None => {
            let Some(image) = egg.docker_images.values().next().cloned() else {
                return Err(bad_request("the configured egg has no docker image"));
            };
            (None, image)
        }
    };

    let Some(startup) = egg.startup_commands.values().next().cloned() else {
        return Err(bad_request("the configured egg has no startup command"));
    };

    Ok(InstallPlan {
        game,
        egg,
        software: software.into(),
        version: version.version,
        java: version.java,
        build,
        image,
        startup,
    })
}

/// Switches the server onto the plan's egg/image/variables and starts the reinstall.
pub async fn apply(
    state: &State,
    server: &mut Server,
    plan: &InstallPlan,
    truncate_directory: bool,
) -> Result<(), anyhow::Error> {
    let egg_changed = server.egg.uuid != plan.egg.uuid;
    server
        .update(
            state,
            UpdateServerOptions {
                egg_uuid: Some(plan.egg.uuid),
                startup: Some(plan.startup.clone()),
                image: Some(plan.image.clone()),
                ..Default::default()
            },
        )
        .await?;

    let values = plan.variables();
    for variable in NestEggVariable::all_by_egg_uuid(&state.database, plan.egg.uuid).await? {
        if let Some((_, value)) = values
            .iter()
            .find(|(name, _)| *name == variable.env_variable)
        {
            ServerVariable::create(&state.database, server.uuid, variable.uuid, value).await?;
        }
    }

    if egg_changed {
        shared::tunnel::poke_nodes(&state.database).await;
    }

    server.clone().sync(state).await?;
    server
        .install_with_options(
            state,
            ServerInstallOptions {
                truncate_directory,
                ..Default::default()
            },
        )
        .await?;

    Ok(())
}

pub fn activity_data(plan: &InstallPlan, truncate_directory: bool) -> serde_json::Value {
    serde_json::json!({
        "egg_uuid": plan.egg.uuid,
        "software": plan.software,
        "version": plan.version,
        "build_id": plan.build.as_ref().map(|build| build.id),
        "build": plan.build.as_ref().map(|build| &build.name),
        "java": plan.java,
        "image": plan.image,
        "truncate_directory": truncate_directory,
    })
}

/// What *Update* installs.
#[derive(ToSchema, Serialize, Clone)]
pub struct UpdateTarget {
    pub version: compact_str::CompactString,
    /// How to show it: the MCJars build name for Java, the version for Bedrock.
    pub name: compact_str::CompactString,
    pub build: Option<crate::mcjars::Build>,
}

impl UpdateTarget {
    pub fn is_installed(&self, current: &crate::detect::Current) -> bool {
        match (&current.build, &self.build) {
            (Some(installed), Some(target)) => installed.id == target.id,
            (None, None) => current.version.as_ref() == Some(&self.version),
            _ => false,
        }
    }
}

/// The newest build of the installed Java version (newer Minecraft versions are never applied
/// automatically), or the newest Bedrock version: Bedrock clients update themselves and can't
/// join an older server, and the server upgrades worlds in place.
pub async fn update_target(
    state: &State,
    current: &crate::detect::Current,
) -> Result<Option<UpdateTarget>, anyhow::Error> {
    match Game::from_software(&current.software) {
        Some(Game::Java) => {
            let Some(version) = &current.version else {
                return Ok(None);
            };
            let build = crate::mcjars::latest_build(state, &current.software, version).await?;
            Ok(Some(UpdateTarget {
                version: version.clone(),
                name: build.name.clone(),
                build: Some(build),
            }))
        }
        Some(Game::Bedrock) => Ok(crate::bedrock::versions(state)
            .await?
            .into_iter()
            .next()
            .map(|version| UpdateTarget {
                name: version.clone(),
                version,
                build: None,
            })),
        // The egg's image updates the server itself every time it starts.
        Some(Game::Hytale) | None => Ok(None),
    }
}
