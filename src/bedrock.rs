use serde::Deserialize;
use shared::State;

/// Community-maintained list of every Bedrock Dedicated Server release.
const VERSIONS_URL: &str =
    "https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json";
/// Mojang's own download links, which only ever point at the newest release.
const LINKS_URL: &str = "https://net-secondary.web.minecraft-services.net/api/v1.0/download/links";
const CACHE_TTL_SECONDS: u64 = 3600;

/// The server type EasyInstall uses for Bedrock Dedicated Server.
pub const SOFTWARE: &str = "BEDROCK";

#[derive(Deserialize)]
struct VersionsFile {
    linux: Platform,
}

#[derive(Deserialize)]
struct Platform {
    versions: Vec<compact_str::CompactString>,
}

#[derive(Deserialize)]
struct LinksResponse {
    result: Links,
}

#[derive(Deserialize)]
struct Links {
    links: Vec<Link>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Link {
    download_type: String,
    download_url: String,
}

fn parse(version: &str) -> Option<Vec<u32>> {
    version.split('.').map(|part| part.parse().ok()).collect()
}

async fn listed_versions(state: &State) -> Result<Vec<compact_str::CompactString>, anyhow::Error> {
    let file: VersionsFile = state
        .client
        .get(VERSIONS_URL)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(file.linux.versions)
}

async fn official_latest(state: &State) -> Result<compact_str::CompactString, anyhow::Error> {
    let response: LinksResponse = state
        .client
        .get(LINKS_URL)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    response
        .result
        .links
        .iter()
        .find(|link| link.download_type == "serverBedrockLinux")
        .and_then(|link| link.download_url.rsplit_once("bedrock-server-"))
        .and_then(|(_, file)| file.strip_suffix(".zip"))
        .map(Into::into)
        .ok_or_else(|| anyhow::anyhow!("no Linux server in Mojang's download links"))
}

/// Stable Linux server versions, newest first.
pub async fn versions(state: &State) -> Result<Vec<compact_str::CompactString>, anyhow::Error> {
    state
        .cache
        .cached(
            &format!("{}::bedrock::versions", crate::PACKAGE_NAME),
            CACHE_TTL_SECONDS,
            || async {
                let (listed, latest) = tokio::join!(listed_versions(state), official_latest(state));

                // Either source alone is enough to install something, so only fail when both do.
                let mut versions = match (listed, latest) {
                    (Ok(mut versions), latest) => {
                        match latest {
                            Ok(latest) => versions.push(latest),
                            Err(err) => {
                                tracing::warn!("failed to fetch Mojang's Bedrock links: {err:#}")
                            }
                        }
                        versions
                    }
                    (Err(err), Ok(latest)) => {
                        tracing::warn!("failed to fetch the Bedrock version list: {err:#}");
                        vec![latest]
                    }
                    (Err(err), Err(_)) => return Err(err),
                };

                versions.retain(|version| parse(version).is_some());
                versions.sort_by_cached_key(|version| std::cmp::Reverse(parse(version)));
                versions.dedup();

                Ok::<_, anyhow::Error>(versions)
            },
        )
        .await
}
