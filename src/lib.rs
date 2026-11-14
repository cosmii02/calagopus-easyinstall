use shared::{
    State,
    extensions::{Extension, ExtensionRouteBuilder},
};
use std::sync::Arc;

mod bedrock;
mod detect;
mod game;
mod hytale;
mod installer;
mod mcjars;
mod routes;
mod settings;
mod updates;

pub const PACKAGE_NAME: &str = "dev.cosmii02.easyinstall";

#[derive(Default)]
pub struct ExtensionStruct;

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn settings_deserializer(
        &self,
        _state: State,
    ) -> shared::extensions::settings::ExtensionSettingsDeserializer {
        Arc::new(settings::ExtensionSettingsDataDeserializer)
    }

    async fn check_for_updates(
        &self,
        state: State,
        current_version: &semver::Version,
    ) -> Result<Option<shared::extensions::ExtensionUpdateInfo>, anyhow::Error> {
        updates::check(&state, current_version).await
    }

    async fn initialize_router(
        &mut self,
        state: State,
        builder: ExtensionRouteBuilder,
    ) -> ExtensionRouteBuilder {
        builder
            .add_admin_api_router(|routes| {
                routes.nest(
                    "/extensions/dev.cosmii02.easyinstall",
                    routes::admin::router(&state),
                )
            })
            .add_client_server_api_router(|routes| {
                routes.nest("/easyinstall", routes::server::router(&state))
            })
    }
}
