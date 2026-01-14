// File explorer operations module
// Provides platform-specific implementations for opening files/directories and showing context menus

use serde::Serialize;
use std::path::Path;
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize)]
pub enum ExplorerError {
    NotFound(String),
    PermissionDenied(String),
    NoDefaultApp(String),
    OsError(String),
}

impl From<tauri_plugin_opener::Error> for ExplorerError {
    fn from(err: tauri_plugin_opener::Error) -> Self {
        ExplorerError::OsError(err.to_string())
    }
}

#[tauri::command]
pub async fn open_file_or_directory(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), ExplorerError> {
    // Validate path exists
    if !Path::new(&path).exists() {
        return Err(ExplorerError::NotFound(format!(
            "Path does not exist: {}",
            path
        )));
    }

    // Use tauri-plugin-opener to open the path
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| ExplorerError::OsError(e.to_string()))?;

    Ok(())
}
