use serde::Serialize;
use shared::{
    State,
    models::{server::Server, server_variable::ServerVariable},
};
use utoipa::ToSchema;

#[derive(ToSchema, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    /// Identified from the sha256 of server.jar: reflects what is actually on disk.
    Detected,
    /// The build id EasyInstall stored in the BUILD variable.
    Recorded,
    /// Only the SOFTWARE / VERSION variables are known, the build is not.
    Variables,
}

#[derive(ToSchema, Serialize, Clone)]
pub struct Current {
    pub software: compact_str::CompactString,
    pub version: Option<compact_str::CompactString>,
    pub build: Option<crate::mcjars::Build>,
    pub source: Source,
}

async fn server_jar_sha256(
    state: &State,
    server: &Server,
) -> Result<Option<String>, anyhow::Error> {
    let fingerprints = server
        .node
        .fetch_cached(&state.database)
        .await?
        .api_client(&state.database)
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

/// What is installed on the server, as far as it can be told.
pub async fn current(state: &State, server: &Server) -> Result<Option<Current>, anyhow::Error> {
    let supported = |software: &str| crate::mcjars::SOFTWARE.contains(&software);

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
            source: Source::Detected,
        }));
    }

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
            source: Source::Recorded,
        }));
    }

    Ok(Some(Current {
        software: software.into(),
        version,
        build: None,
        source: Source::Variables,
    }))
}
