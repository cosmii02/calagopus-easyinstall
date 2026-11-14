use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod get {
    use serde::Serialize;
    use shared::{
        GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    /// Which games have an egg configured, keyed like the frontend catalog.
    #[derive(ToSchema, Serialize)]
    struct Games {
        minecraft: bool,
        bedrock: bool,
        hytale: bool,
    }

    #[derive(ToSchema, Serialize)]
    struct Response {
        games: Games,
    }

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(Response)),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
    ))]
    pub async fn route(state: GetState, permissions: GetPermissionManager) -> ApiResponseResult {
        permissions.has_server_permission("settings.install")?;

        let settings = state.settings.get().await?;
        let ext: &crate::settings::ExtensionSettingsData = settings.find_extension_settings()?;

        ApiResponse::new_serialized(Response {
            games: Games {
                minecraft: ext.minecraft_egg_uuid.is_some(),
                bedrock: ext.bedrock_egg_uuid.is_some(),
                hytale: ext.hytale_egg_uuid.is_some(),
            },
        })
        .ok()
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .with_state(state.clone())
}
