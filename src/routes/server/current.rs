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
        /// What *Update* would install.
        latest: Option<crate::installer::UpdateTarget>,
        /// The installed release is known and a newer one exists.
        update_available: bool,
        /// There is something to install: an update, or the latest release when the installed one is unknown.
        can_update: bool,
        /// Java only: newest release of the same server type, when it differs from the installed version.
        newer_version: Option<compact_str::CompactString>,
        /// The server downloads updates by itself when it starts (Hytale), there is nothing to update here.
        auto_updates: bool,
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
            latest: None,
            update_available: false,
            can_update: false,
            newer_version: None,
            auto_updates: false,
        };

        if let Some(current) = &current {
            response.auto_updates = crate::game::Game::from_software(&current.software)
                == Some(crate::game::Game::Hytale);

            match crate::installer::update_target(&state, current).await {
                Ok(Some(target)) => {
                    let installed = target.is_installed(current);
                    response.update_available = current.is_exact() && !installed;
                    response.can_update = !installed;
                    response.latest = Some(target);
                }
                Ok(None) => {}
                Err(err) => tracing::warn!("failed to look up the latest release: {err:#}"),
            }

            if crate::game::Game::from_software(&current.software) == Some(crate::game::Game::Java)
                && let Some(version) = &current.version
                && let Ok(versions) = crate::mcjars::versions(&state, &current.software).await
            {
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
