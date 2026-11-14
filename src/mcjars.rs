use serde::{Deserialize, Serialize};
use shared::State;
use utoipa::ToSchema;

const API: &str = "https://versions.mcjars.app/api";
const CACHE_TTL_SECONDS: u64 = 3600;
const LATEST_BUILD_TTL_SECONDS: u64 = 600;
const BUILD_TTL_SECONDS: u64 = 86400;

/// MCJars server types EasyInstall offers. Anything else is rejected before hitting the API.
pub const SOFTWARE: &[&str] = &["VANILLA", "PAPER", "FORGE", "NEOFORGE", "FABRIC"];

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct McVersion {
    pub version: compact_str::CompactString,
    pub java: u16,
}

#[derive(Deserialize)]
struct BuildsResponse {
    builds: serde_json::Map<String, serde_json::Value>,
}

/// Release versions for a software type, newest first.
pub async fn versions(state: &State, software: &str) -> Result<Vec<McVersion>, anyhow::Error> {
    let software = software.to_owned();
    state
        .cache
        .cached(
            &format!("{}::mcjars::versions::{software}", crate::PACKAGE_NAME),
            CACHE_TTL_SECONDS,
            || async move {
                let response: BuildsResponse = state
                    .client
                    .get(format!("{API}/v2/builds/{software}"))
                    .send()
                    .await?
                    .error_for_status()?
                    .json()
                    .await?;

                // serde_json is built with preserve_order: MCJars lists versions oldest first.
                let versions = response
                    .builds
                    .into_iter()
                    .rev()
                    .filter(|(_, build)| build["type"] == "RELEASE")
                    .filter_map(|(version, build)| {
                        Some(McVersion {
                            version: version.into(),
                            java: build["java"].as_u64()?.try_into().ok()?,
                        })
                    })
                    .collect::<Vec<_>>();

                Ok::<_, anyhow::Error>(versions)
            },
        )
        .await
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct Build {
    pub id: i64,
    pub software: compact_str::CompactString,
    pub version: Option<compact_str::CompactString>,
    pub build_number: Option<i64>,
    pub name: compact_str::CompactString,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawBuild {
    id: i64,
    r#type: compact_str::CompactString,
    version_id: Option<compact_str::CompactString>,
    build_number: Option<i64>,
    name: compact_str::CompactString,
}

#[derive(Deserialize)]
struct BuildResponse {
    success: bool,
    build: Option<RawBuild>,
}

async fn fetch_build(state: &State, url: String) -> Result<Option<Build>, anyhow::Error> {
    let response = state.client.get(url).send().await?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    let response: BuildResponse = response.error_for_status()?.json().await?;
    Ok(response
        .build
        .filter(|_| response.success)
        .map(|raw| Build {
            id: raw.id,
            software: raw.r#type,
            version: raw.version_id,
            build_number: raw.build_number,
            name: raw.name,
        }))
}

pub async fn latest_build(
    state: &State,
    software: &str,
    version: &str,
) -> Result<Build, anyhow::Error> {
    let url = format!("{API}/v1/builds/{software}/{version}/latest");
    state
        .cache
        .cached(
            &format!(
                "{}::mcjars::latest::{software}::{version}",
                crate::PACKAGE_NAME
            ),
            LATEST_BUILD_TTL_SECONDS,
            || async move {
                fetch_build(state, url)
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("mcjars has no build for this version"))
            },
        )
        .await
}

/// Build by MCJars build id (what EasyInstall stores in BUILD) or by a jar's sha256.
pub async fn build(state: &State, id_or_hash: &str) -> Result<Option<Build>, anyhow::Error> {
    let url = format!("{API}/v1/build/{id_or_hash}");
    state
        .cache
        .cached(
            &format!("{}::mcjars::build::{id_or_hash}", crate::PACKAGE_NAME),
            BUILD_TTL_SECONDS,
            || fetch_build(state, url),
        )
        .await
}
