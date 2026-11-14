use axum::http::StatusCode;
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

pub struct InstallPlan {
    pub egg: NestEgg,
    pub software: compact_str::CompactString,
    pub version: crate::mcjars::McVersion,
    pub build: crate::mcjars::Build,
    pub image: compact_str::CompactString,
    pub startup: compact_str::CompactString,
}

pub fn bad_request(message: impl AsRef<str>) -> ApiResponse {
    ApiResponse::error(message.as_ref()).with_status(StatusCode::BAD_REQUEST)
}

pub fn upstream_error(err: anyhow::Error) -> ApiResponse {
    tracing::warn!("mcjars request failed: {err:#}");
    ApiResponse::error("failed to reach MCJars").with_status(StatusCode::BAD_GATEWAY)
}

pub async fn configured_egg_uuid(state: &State) -> Result<Option<uuid::Uuid>, anyhow::Error> {
    let settings = state.settings.get().await?;
    let ext: &crate::settings::ExtensionSettingsData = settings.find_extension_settings()?;
    Ok(ext.minecraft_egg_uuid)
}

/// The egg's image for exactly this Java version, else the closest newer one.
fn pick_image(egg: &NestEgg, java: u16) -> Option<compact_str::CompactString> {
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
    if !crate::mcjars::SOFTWARE.contains(&software) {
        return Err(bad_request("unsupported server type"));
    }

    let Some(egg_uuid) = configured_egg_uuid(state).await? else {
        return Err(bad_request(
            "EasyInstall has not been configured by an administrator yet",
        ));
    };
    let Some(egg) = NestEgg::by_uuid_optional(&state.database, egg_uuid).await? else {
        return Err(bad_request(
            "the egg configured for EasyInstall no longer exists",
        ));
    };

    let versions = crate::mcjars::versions(state, software)
        .await
        .map_err(upstream_error)?;
    let Some(version) = versions.into_iter().find(|v| v.version == version) else {
        return Err(bad_request("unknown version for this server type"));
    };
    let build = crate::mcjars::latest_build(state, software, &version.version)
        .await
        .map_err(upstream_error)?;

    let Some(image) = pick_image(&egg, version.java) else {
        return Err(bad_request(format!(
            "the configured egg has no Java {} (or newer) image",
            version.java
        )));
    };
    let Some(startup) = egg.startup_commands.values().next().cloned() else {
        return Err(bad_request("the configured egg has no startup command"));
    };

    Ok(InstallPlan {
        egg,
        software: software.into(),
        version,
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

    let build_id = plan.build.id.to_string();
    for variable in NestEggVariable::all_by_egg_uuid(&state.database, plan.egg.uuid).await? {
        let value = match variable.env_variable.as_str() {
            "SOFTWARE" => plan.software.as_str(),
            "VERSION" => plan.version.version.as_str(),
            "BUILD" => build_id.as_str(),
            _ => continue,
        };
        ServerVariable::create(&state.database, server.uuid, variable.uuid, value).await?;
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
        "version": plan.version.version,
        "build_id": plan.build.id,
        "build": plan.build.name,
        "java": plan.version.java,
        "image": plan.image,
        "truncate_directory": truncate_directory,
    })
}
