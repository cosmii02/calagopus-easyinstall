use shared::State;
use utoipa_axum::router::OpenApiRouter;

mod current;
mod install;
mod status;
mod update;
mod versions;

pub fn router(state: &State) -> OpenApiRouter<State> {
    OpenApiRouter::new()
        .merge(status::router(state))
        .nest("/versions/{software}", versions::router(state))
        .nest("/current", current::router(state))
        .nest("/install", install::router(state))
        .nest("/update", update::router(state))
        .with_state(state.clone())
}
