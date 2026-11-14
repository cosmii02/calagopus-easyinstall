use shared::State;
use utoipa_axum::{router::OpenApiRouter, routes};

mod get {
    use serde::Serialize;
    use shared::{
        GetState,
        models::{server::GetServer, user::GetPermissionManager},
        response::{ApiResponse, ApiResponseResult},
    };
    use utoipa::ToSchema;

    #[derive(ToSchema, Serialize)]
    struct Response {
        current: Option<crate::detect::Current>,
        latest_build: Option<crate::mcjars::Build>,
        /// The installed build is known and a newer build of the same version exists.
        update_available: bool,
        /// Type and version are known, so the latest build can be (re)installed.
        can_update: bool,
        /// Newest release of the same server type, when it differs from the installed version.
        newer_version: Option<compact_str::CompactString>,
    }

    #[utoipa::path(get, path = "/", responses(
        (status = OK, body = inline(Response)),
    ), params(
        ("server" = uuid::Uuid, description = "The server ID"),
    ))]
    pub async fn route(
        state: GetState,
        permissions: GetPermissionManager,
        server: GetServer,
    ) -> ApiResponseResult {
        permissions.has_server_permission("settings.install")?;

        let current = crate::detect::current(&state, &server).await?;

        let mut response = Response {
            current: current.clone(),
            latest_build: None,
            update_available: false,
            can_update: false,
            newer_version: None,
        };

        if let Some(current) = &current
            && let Some(version) = &current.version
        {
            match crate::mcjars::latest_build(&state, &current.software, version).await {
                Ok(latest) => {
                    response.update_available = current
                        .build
                        .as_ref()
                        .is_some_and(|build| build.id != latest.id);
                    response.can_update = current.build.is_none() || response.update_available;
                    response.latest_build = Some(latest);
                }
                Err(err) => tracing::warn!("failed to fetch latest build from mcjars: {err:#}"),
            }

            if let Ok(versions) = crate::mcjars::versions(&state, &current.software).await {
                response.newer_version = versions
                    .first()
                    .map(|newest| newest.version.clone())
                    .filter(|newest| newest != version);
            }
        }

        ApiResponse::new_serialized(response).ok()
    }
}

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .routes(routes!(get::route))
        .with_state(state.clone())
}
