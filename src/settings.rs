use serde::{Deserialize, Serialize};
use shared::extensions::settings::{
    ExtensionSettings, SettingsDeserializeExt, SettingsDeserializer, SettingsSerializeExt,
    SettingsSerializer,
};
use utoipa::ToSchema;

#[derive(ToSchema, Serialize, Deserialize, Default)]
pub struct ExtensionSettingsData {
    /// Egg the server is switched to for Minecraft: Java Edition installs (an MCJars-style egg
    /// with SOFTWARE / VERSION / BUILD variables).
    pub minecraft_egg_uuid: Option<uuid::Uuid>,
    /// Egg the server is switched to for Minecraft: Bedrock Edition installs (a Bedrock
    /// Dedicated Server egg with a BEDROCK_VERSION variable).
    pub bedrock_egg_uuid: Option<uuid::Uuid>,
    /// Egg the server is switched to for Hytale installs (an egg with a HYTALE_PATCHLINE
    /// variable whose image downloads the server).
    pub hytale_egg_uuid: Option<uuid::Uuid>,
}

#[async_trait::async_trait]
impl SettingsSerializeExt for ExtensionSettingsData {
    async fn serialize(
        &self,
        serializer: SettingsSerializer,
    ) -> Result<SettingsSerializer, anyhow::Error> {
        Ok(serializer
            .write_serde_setting("minecraft_egg_uuid", &self.minecraft_egg_uuid)?
            .write_serde_setting("bedrock_egg_uuid", &self.bedrock_egg_uuid)?
            .write_serde_setting("hytale_egg_uuid", &self.hytale_egg_uuid)?)
    }
}

pub struct ExtensionSettingsDataDeserializer;

#[async_trait::async_trait]
impl SettingsDeserializeExt for ExtensionSettingsDataDeserializer {
    async fn deserialize_boxed(
        &self,
        deserializer: SettingsDeserializer<'_>,
    ) -> Result<ExtensionSettings, anyhow::Error> {
        Ok(Box::new(ExtensionSettingsData {
            minecraft_egg_uuid: deserializer
                .read_serde_setting("minecraft_egg_uuid")
                .unwrap_or_default(),
            bedrock_egg_uuid: deserializer
                .read_serde_setting("bedrock_egg_uuid")
                .unwrap_or_default(),
            hytale_egg_uuid: deserializer
                .read_serde_setting("hytale_egg_uuid")
                .unwrap_or_default(),
        }))
    }
}
