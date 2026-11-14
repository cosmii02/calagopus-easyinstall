use serde::Serialize;
use shared::{
    State,
    models::{server::Server, server_variable::ServerVariable},
};
use utoipa::ToSchema;

#[derive(ToSchema, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    /// Identified from the server's files (server.jar's sha256, Hytale's version file): reflects
    /// what is actually on disk.
    Detected,
    /// The build id EasyInstall stored in the BUILD variable.
    Recorded,
    /// The exact version is pinned in a variable (Bedrock's BEDROCK_VERSION).
    Pinned,
    /// Only the type / version variables are known, the build is not.
    Variables,
}

#[derive(ToSchema, Serialize, Clone)]
pub struct Current {
    pub software: compact_str::CompactString,
    pub version: Option<compact_str::CompactString>,
    pub build: Option<crate::mcjars::Build>,
    /// The installed build when it isn't an MCJars one (Hytale, where `version` is the patchline).
    pub installed_version: Option<compact_str::CompactString>,
    pub source: Source,
}

impl Current {
    /// The exact installed release is known, so it can be compared with the newest one.
    pub fn is_exact(&self) -> bool {
        self.build.is_some() || self.source == Source::Pinned
    }
}

async fn wings(
    state: &State,
    server: &Server,
) -> Result<wings_api::client::WingsClient, anyhow::Error> {
    server
        .node
        .fetch_cached(&state.database)
        .await?
        .api_client(&state.database)
        .await
}

async fn server_jar_sha256(
    state: &State,
    server: &Server,
) -> Result<Option<String>, anyhow::Error> {
    let fingerprints = wings(state, server)
        .await?
        .get_servers_server_files_fingerprints(
            server.uuid,
            &wings_api::servers_server_files_fingerprints::get::Query {
                algorithm: Some(wings_api::Algorithm::Sha256),
                files: Some(vec!["server.jar".into()]),
                ..Default::default()
            },
        )
        .await?;

    Ok(fingerprints
        .fingerprints
        .into_values()
        .next()
        .map(|hash| hash.to_string())
        .filter(|hash| !hash.is_empty()))
}

async fn hytale_version(
    state: &State,
    server: &Server,
) -> Result<Option<compact_str::CompactString>, anyhow::Error> {
    let mut reader = match wings(state, server)
        .await?
        .get_servers_server_files_contents(
            server.uuid,
            &wings_api::servers_server_files_contents::get::Query {
                file: Some(crate::hytale::VERSION_FILE.into()),
                max_size: Some(1024),
                ..Default::default()
            },
        )
        .await
    {
        Ok(reader) => reader,
        // Not downloaded yet: the image writes it on the server's first start.
        Err(wings_api::client::ApiHttpError::Http(status, _))
            if status == reqwest::StatusCode::NOT_FOUND =>
        {
            return Ok(None);
        }
        Err(err) => return Err(err.into()),
    };

    let mut contents = String::new();
    tokio::io::AsyncReadExt::read_to_string(&mut reader, &mut contents).await?;
    let version = contents.trim();
    Ok((!version.is_empty()).then(|| version.into()))
}

/// What is installed on the server, as far as it can be told.
pub async fn current(state: &State, server: &Server) -> Result<Option<Current>, anyhow::Error> {
    let supported = |software: &str| crate::mcjars::SOFTWARE.contains(&software);

    let variables =
        ServerVariable::all_by_server_uuid_egg_uuid(&state.database, server.uuid, server.egg.uuid)
            .await?;
    let variable = |name: &str| {
        variables
            .iter()
            .find(|v| v.variable.env_variable == name)
            .map(|v| v.value.trim())
            .filter(|v| !v.is_empty())
    };

    // Checked before server.jar, which a Java install that wasn't wiped leaves behind.
    if let Some(patchline) = variable("HYTALE_PATCHLINE") {
        let installed_version = hytale_version(state, server)
            .await
            .inspect_err(|err| {
                tracing::debug!(server = %server.uuid, "could not read Hytale's version file: {err:#}")
            })
            .ok()
            .flatten();
        return Ok(Some(Current {
            software: crate::hytale::SOFTWARE.into(),
            version: Some(patchline.into()),
            build: None,
            source: if installed_version.is_some() {
                Source::Detected
            } else {
                Source::Variables
            },
            installed_version,
        }));
    }

    if variables
        .iter()
        .any(|v| v.variable.env_variable == "BEDROCK_VERSION")
    {
        let version = variable("BEDROCK_VERSION").filter(|v| !v.eq_ignore_ascii_case("latest"));
        return Ok(Some(Current {
            software: crate::bedrock::SOFTWARE.into(),
            version: version.map(Into::into),
            build: None,
            installed_version: None,
            source: if version.is_some() {
                Source::Pinned
            } else {
                Source::Variables
            },
        }));
    }

    let detected = match server_jar_sha256(state, server).await {
        Ok(Some(hash)) => crate::mcjars::build(state, &hash).await?,
        Ok(None) => None,
        Err(err) => {
            tracing::debug!(server = %server.uuid, "could not fingerprint server.jar: {err:#}");
            None
        }
    };
    if let Some(build) = detected.filter(|build| supported(&build.software)) {
        return Ok(Some(Current {
            software: build.software.clone(),
            version: build.version.clone(),
            build: Some(build),
            installed_version: None,
            source: Source::Detected,
        }));
    }

    let Some(software) = variable("SOFTWARE").filter(|s| supported(s)) else {
        return Ok(None);
    };
    let version = variable("VERSION")
        .filter(|v| !v.eq_ignore_ascii_case("latest"))
        .map(compact_str::CompactString::from);

    if let Some(build_id) = variable("BUILD").filter(|b| b.chars().all(|c| c.is_ascii_digit()))
        && let Some(build) = crate::mcjars::build(state, build_id).await?
        && build.software == software
    {
        return Ok(Some(Current {
            software: software.into(),
            version: build.version.clone().or(version),
            build: Some(build),
            installed_version: None,
            source: Source::Recorded,
        }));
    }

    Ok(Some(Current {
        software: software.into(),
        version,
        build: None,
        installed_version: None,
        source: Source::Variables,
    }))
}
