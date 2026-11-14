use serde::{Deserialize, Serialize};
use shared::State;
use utoipa::ToSchema;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Game {
    /// Minecraft: Java Edition, versions and builds from MCJars.
    Java,
    /// Minecraft: Bedrock Edition, the official Bedrock Dedicated Server.
    Bedrock,
    /// Hytale, downloaded and updated by the egg's image on every start.
    Hytale,
}

impl Game {
    pub fn from_software(software: &str) -> Option<Self> {
        if crate::mcjars::SOFTWARE.contains(&software) {
            Some(Self::Java)
        } else if software == crate::bedrock::SOFTWARE {
            Some(Self::Bedrock)
        } else if software == crate::hytale::SOFTWARE {
            Some(Self::Hytale)
        } else {
            None
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Java => "Minecraft: Java Edition",
            Self::Bedrock => "Minecraft: Bedrock Edition",
            Self::Hytale => "Hytale",
        }
    }

    pub async fn egg_uuid(self, state: &State) -> Result<Option<uuid::Uuid>, anyhow::Error> {
        let settings = state.settings.get().await?;
        let ext: &crate::settings::ExtensionSettingsData = settings.find_extension_settings()?;
        Ok(match self {
            Self::Java => ext.minecraft_egg_uuid,
            Self::Bedrock => ext.bedrock_egg_uuid,
            Self::Hytale => ext.hytale_egg_uuid,
        })
    }
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct Version {
    pub version: compact_str::CompactString,
    /// Java version the server needs; unset when the egg's image takes care of it.
    pub java: Option<u16>,
}

/// Installable versions of a server type, newest first.
pub async fn versions(
    state: &State,
    game: Game,
    software: &str,
) -> Result<Vec<Version>, anyhow::Error> {
    Ok(match game {
        Game::Java => crate::mcjars::versions(state, software)
            .await?
            .into_iter()
            .map(|v| Version {
                version: v.version,
                java: Some(v.java),
            })
            .collect(),
        Game::Bedrock => crate::bedrock::versions(state)
            .await?
            .into_iter()
            .map(|version| Version {
                version,
                java: None,
            })
            .collect(),
        Game::Hytale => crate::hytale::PATCHLINES
            .iter()
            .map(|patchline| Version {
                version: (*patchline).into(),
                java: None,
            })
            .collect(),
    })
}
