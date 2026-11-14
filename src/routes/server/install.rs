use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod post {
    use axum::http::StatusCode;
    use garde::Validate;
    use serde::{Deserialize, Serialize};
    use shared::{
        ApiError, GetState,
        models::{
            server::{GetServer, GetServerActivityLogger},
            user::GetPermissionManager,
        },
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Validate, Deserialize)]
    pub struct Payload {
        #[garde(length(chars, min = 1, max = 20))]
        software: compact_str::CompactString,
        #[garde(length(chars, min = 1, max = 64))]
        version: compact_str::CompactString,
        #[garde(skip)]
        truncate_directory: bool,
    }

    #[derive(ToSchema, Serialize)]
    struct Response {}

    #[utoipa::path(post, path = "/", responses(
        (status = ACCEPTED, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
        (status = UNAUTHORIZED, body = ApiError),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
    ), request_body = inline(Payload))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        mut server: GetServer,
        activity_logger: GetServerActivityLogger,
        shared::Payload(data): shared::Payload<Payload>,
    ) -> ApiResponseResult {
        if let Err(errors) = shared::utils::validate_data(&data) {
            return ApiResponse::new_serialized(ApiError::new_strings_value(errors))
                .with_status(StatusCode::BAD_REQUEST)
                .ok();
        }

        permissions.has_server_permission("settings.install")?;

        let plan = match crate::installer::plan(&state, &data.software, &data.version).await {
            Ok(plan) => plan,
            Err(response) => return response.ok(),
        };

        // Detached so a client disconnect can't stop it halfway (same as the core reinstall route).
        tokio::spawn(async move {
            crate::installer::apply(&state, &mut server, &plan, data.truncate_directory).await?;

            activity_logger
                .log(
                    "server:easyinstall.install",
                    crate::installer::activity_data(&plan, data.truncate_directory),
                )
                .await;

            ApiResponse::new_serialized(Response {})
                .with_status(StatusCode::ACCEPTED)
                .ok()
        })
        .await?
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(post::route))
        .with_state(state.clone())
}
