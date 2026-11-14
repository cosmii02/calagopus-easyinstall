use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod post {
    use axum::http::StatusCode;
    use serde::Serialize;
    use shared::{
        ApiError, GetState,
        models::{
            server::{GetServer, GetServerActivityLogger},
            user::GetPermissionManager,
        },
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {}

    /// Reinstalls the newest build of the installed Java version, or the newest Bedrock version.
    /// Never wipes files.
    #[utoipa::path(post, path = "/", responses(
        (status = ACCEPTED, body = inline(Response)),
        (status = BAD_REQUEST, body = ApiError),
        (status = UNAUTHORIZED, body = ApiError),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
    ))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        mut server: GetServer,
        activity_logger: GetServerActivityLogger,
    ) -> ApiResponseResult {
        permissions.has_server_permission("settings.install")?;

        let Some(current) = crate::detect::current(&state, &server).await? else {
            return crate::installer::bad_request(
                "could not tell what is installed on this server",
            )
            .ok();
        };
        let target = match crate::installer::update_target(&state, &current).await {
            Ok(Some(target)) => target,
            Ok(None)
                if crate::game::Game::from_software(&current.software)
                    == Some(crate::game::Game::Hytale) =>
            {
                return crate::installer::bad_request(
                    "this server downloads updates by itself when it starts",
                )
                .ok();
            }
            Ok(None) => {
                return crate::installer::bad_request("the installed version is unknown").ok();
            }
            Err(err) => return crate::installer::upstream_error(err).ok(),
        };
        if target.is_installed(&current) {
            return crate::installer::bad_request("already on the latest release").ok();
        }

        let plan = match crate::installer::plan(&state, &current.software, &target.version).await {
            Ok(plan) => plan,
            Err(response) => return response.ok(),
        };

        tokio::spawn(async move {
            crate::installer::apply(&state, &mut server, &plan, false).await?;

            let mut data = crate::installer::activity_data(&plan, false);
            data["previous_version"] = serde_json::json!(current.version);
            data["previous_build_id"] = serde_json::json!(current.build.map(|build| build.id));
            activity_logger.log("server:easyinstall.update", data).await;

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
