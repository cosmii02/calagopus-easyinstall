use serde::{Deserialize, Serialize};
use shared::{State, extensions::ExtensionUpdateInfo};

const RELEASES_URL: &str =
    "https://api.github.com/repos/cosmii02/calagopus-easyinstall/releases?per_page=30";
// Unauthenticated GitHub API calls are limited to 60/hour per IP.
const CACHE_TTL_SECONDS: u64 = 3600;

#[derive(Serialize, Deserialize)]
struct Release {
    tag_name: String,
    #[serde(default)]
    body: Option<String>,
    draft: bool,
    prerelease: bool,
}

/// Changelog lines from a release body, minus headings, blank lines and the compare link.
fn changelog_lines(version: &semver::Version, body: &str) -> Vec<compact_str::CompactString> {
    body.lines()
        .map(str::trim)
        .filter(|line| {
            !line.is_empty() && !line.starts_with('#') && !line.starts_with("**Full Changelog**")
        })
        .map(|line| {
            let line = line.trim_start_matches(['*', '-']).trim_start();
            compact_str::format_compact!("{version}: {line}")
        })
        .collect()
}

pub async fn check(
    state: &State,
    current_version: &semver::Version,
) -> Result<Option<ExtensionUpdateInfo>, anyhow::Error> {
    let releases: Vec<Release> = state
        .cache
        .cached(
            &format!("{}::github::releases", crate::PACKAGE_NAME),
            CACHE_TTL_SECONDS,
            || async {
                state
                    .client
                    .get(RELEASES_URL)
                    .header("Accept", "application/vnd.github+json")
                    .send()
                    .await?
                    .error_for_status()?
                    .json::<Vec<Release>>()
                    .await
            },
        )
        .await?;

    let mut newer: Vec<(semver::Version, Option<String>)> = releases
        .into_iter()
        .filter(|release| !release.draft && !release.prerelease)
        .filter_map(|release| {
            let version = semver::Version::parse(release.tag_name.trim_start_matches('v')).ok()?;
            (version > *current_version).then_some((version, release.body))
        })
        .collect();
    newer.sort_by(|(a, _), (b, _)| b.cmp(a));

    let Some((latest, _)) = newer.first() else {
        return Ok(None);
    };

    Ok(Some(ExtensionUpdateInfo {
        version: latest.clone(),
        changes: newer
            .iter()
            .flat_map(|(version, body)| changelog_lines(version, body.as_deref().unwrap_or("")))
            .collect(),
    }))
}
