use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod get {
    use axum::{extract::Path, http::StatusCode};
    use serde::Serialize;
    use shared::{
        ApiError, GetState,
        models::user::GetPermissionManager,
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        versions: Vec<crate::game::Version>,
    }

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
        ("software" = String, description = "Server type: an MCJars type such as PAPER, or BEDROCK"),
    ))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        Path((_server, software)): Path<(String, String)>,
    ) -> ApiResponseResult {
        permissions.has_server_permission("settings.install")?;

        let Some(game) = crate::game::Game::from_software(&software) else {
            return ApiResponse::error("unsupported server type")
                .with_status(StatusCode::BAD_REQUEST)
                .ok();
        };

        let versions = match crate::game::versions(&state, game, &software).await {
            Ok(versions) => versions,
            Err(err) => {
                tracing::warn!(software, "failed to fetch versions: {err:#}");
                return ApiResponse::error("failed to fetch versions")
                    .with_status(StatusCode::BAD_GATEWAY)
                    .ok();
            }
        };

        ApiResponse::new_serialized(Response { versions }).ok()
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .with_state(state.clone())
}
