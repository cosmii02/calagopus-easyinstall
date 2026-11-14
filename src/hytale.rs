/// The server type EasyInstall uses for the Hytale dedicated server.
pub const SOFTWARE: &str = "HYTALE";

/// The Hytale downloader only ever fetches the newest build of a patchline, so the patchlines
/// stand in for versions.
pub const PATCHLINES: &[&str] = &["release", "pre-release"];

/// The file the Hytale image writes the downloaded build into, and checks for updates on start.
pub const VERSION_FILE: &str = "version";
