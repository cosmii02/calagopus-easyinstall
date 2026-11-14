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
        versions: Vec<crate::mcjars::McVersion>,
    }

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
        ("software" = String, description = "MCJars server type, e.g. PAPER"),
    ))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        Path((_server, software)): Path<(String, String)>,
    ) -> ApiResponseResult {
        permissions.has_server_permission("settings.install")?;

        if !crate::mcjars::SOFTWARE.contains(&software.as_str()) {
            return ApiResponse::error("unsupported server type")
                .with_status(StatusCode::BAD_REQUEST)
                .ok();
        }

        let versions = match crate::mcjars::versions(&state, &software).await {
            Ok(versions) => versions,
            Err(err) => {
                tracing::warn!(software, "failed to fetch versions from mcjars: {err:#}");
                return ApiResponse::error("failed to fetch versions from MCJars")
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
