// File explorer operations module
// Provides platform-specific implementations for opening files/directories and showing context menus

use serde::Serialize;
use std::path::Path;
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "message")]
#[allow(dead_code)] // Variants will be used in future platform implementations
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
    log::info!("[explorer] open_file_or_directory called: path={}", path);

    // Validate path exists
    if !Path::new(&path).exists() {
        log::warn!("[explorer] Path does not exist: {}", path);
        return Err(ExplorerError::NotFound(format!(
            "Path does not exist: {}",
            path
        )));
    }

    // Check if path is file or directory
    let is_dir = Path::new(&path).is_dir();
    log::info!(
        "[explorer] Opening {}: {}",
        if is_dir { "directory" } else { "file" },
        path
    );

    // Use tauri-plugin-opener to open the path
    let start_time = std::time::Instant::now();
    match app.opener().open_path(&path, None::<&str>) {
        Ok(_) => {
            let duration = start_time.elapsed();
            log::info!(
                "[explorer] Successfully opened {} in {:?}: {}",
                if is_dir { "directory" } else { "file" },
                duration,
                path
            );
            Ok(())
        }
        Err(e) => {
            let duration = start_time.elapsed();
            log::error!(
                "[explorer] Failed to open {} after {:?}: {} - Error: {}",
                if is_dir { "directory" } else { "file" },
                duration,
                path,
                e
            );
            Err(ExplorerError::OsError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn show_context_menu(
    _app: tauri::AppHandle,
    path: String,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError> {
    log::info!(
        "[explorer] show_context_menu called: path={}, coordinates=({:?}, {:?})",
        path,
        x,
        y
    );

    // Validate path exists
    if !Path::new(&path).exists() {
        log::warn!("[explorer] Path does not exist for context menu: {}", path);
        return Err(ExplorerError::NotFound(format!(
            "Path does not exist: {}",
            path
        )));
    }

    let is_dir = Path::new(&path).is_dir();
    log::info!(
        "[explorer] Showing context menu for {}: {}",
        if is_dir { "directory" } else { "file" },
        path
    );

    let start_time = std::time::Instant::now();

    // Platform-specific implementation
    #[cfg(target_os = "windows")]
    {
        log::info!("[explorer] Using Windows context menu implementation");
        let result = show_context_menu_windows(&path, x, y);
        let duration = start_time.elapsed();
        match &result {
            Ok(_) => {
                log::info!(
                    "[explorer] Windows context menu shown successfully in {:?}: {}",
                    duration,
                    path
                );
            }
            Err(e) => {
                log::error!(
                    "[explorer] Windows context menu failed after {:?}: {} - Error: {:?}",
                    duration,
                    path,
                    e
                );
            }
        }
        result
    }

    #[cfg(target_os = "macos")]
    {
        log::info!("[explorer] Using macOS context menu implementation");
        let result = show_context_menu_macos(&path, x, y);
        let duration = start_time.elapsed();
        match &result {
            Ok(_) => {
                log::info!(
                    "[explorer] macOS context menu shown successfully in {:?}: {}",
                    duration,
                    path
                );
            }
            Err(e) => {
                log::error!(
                    "[explorer] macOS context menu failed after {:?}: {} - Error: {:?}",
                    duration,
                    path,
                    e
                );
            }
        }
        result
    }

    #[cfg(target_os = "linux")]
    {
        log::info!("[explorer] Using Linux context menu implementation");
        let result = show_context_menu_linux(&path, x, y).await;
        let duration = start_time.elapsed();
        match &result {
            Ok(_) => {
                log::info!(
                    "[explorer] Linux context menu shown successfully in {:?}: {}",
                    duration,
                    path
                );
            }
            Err(e) => {
                log::error!(
                    "[explorer] Linux context menu failed after {:?}: {} - Error: {:?}",
                    duration,
                    path,
                    e
                );
            }
        }
        result
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        log::error!("[explorer] Context menu not supported on this platform");
        Err(ExplorerError::OsError(
            "Context menu not supported on this platform".to_string(),
        ))
    }
}

#[cfg(target_os = "windows")]
fn show_context_menu_windows(
    path: &str,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        core::{Interface, PCWSTR, PCSTR},
        Win32::{
            Foundation::{POINT, HANDLE, BOOL},
            System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED},
            UI::Shell::{
                IContextMenu, IShellItem, SHCreateItemFromParsingName, CMF_NORMAL,
                CMINVOKECOMMANDINFO,
            },
            UI::WindowsAndMessaging::{
                TrackPopupMenu, GetCursorPos, GetForegroundWindow, CreatePopupMenu, DestroyMenu,
                TPM_LEFTALIGN, TPM_RETURNCMD, TPM_RIGHTBUTTON,
            },
        },
    };

    log::debug!(
        "[explorer::windows] show_context_menu_windows called: path={}, x={:?}, y={:?}",
        path,
        x,
        y
    );

    // Convert path to wide string
    let path_wide: Vec<u16> = OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    // Initialize COM
    unsafe {
        let com_result = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        if com_result.is_err() {
            log::warn!(
                "[explorer::windows] COM already initialized or failed: {:?}",
                com_result
            );
        }
    }

    let result = unsafe {
        // Create IShellItem from file path
        let shell_item: IShellItem = SHCreateItemFromParsingName(
            PCWSTR(path_wide.as_ptr()),
            None,
        )
        .map_err(|e| {
            log::error!(
                "[explorer::windows] Failed to create shell item from path '{}': {:?}",
                path,
                e
            );
            ExplorerError::OsError(format!("Failed to parse path: {:?}", e))
        })?;

        // Query for IContextMenu interface
        let context_menu: IContextMenu = shell_item
            .cast()
            .map_err(|e| {
                log::error!(
                    "[explorer::windows] Failed to get IContextMenu for '{}': {:?}",
                    path,
                    e
                );
                ExplorerError::OsError(format!("Failed to get context menu: {:?}", e))
            })?;

        // Get foreground window handle
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() {
            log::warn!("[explorer::windows] Failed to get foreground window");
        }

        // Get cursor position or use provided coordinates
        let mut point = POINT { x: 0, y: 0 };
        if let (Some(x_coord), Some(y_coord)) = (x, y) {
            point.x = x_coord as i32;
            point.y = y_coord as i32;
            log::debug!(
                "[explorer::windows] Using provided coordinates: ({}, {})",
                point.x,
                point.y
            );
        } else {
            // Get current cursor position
            if GetCursorPos(&mut point).is_err() {
                log::warn!(
                    "[explorer::windows] Failed to get cursor position, using (0, 0)"
                );
                point.x = 0;
                point.y = 0;
            } else {
                log::debug!(
                    "[explorer::windows] Using cursor position: ({}, {})",
                    point.x,
                    point.y
                );
            }
        }

        // Create a popup menu
        let hmenu = CreatePopupMenu().map_err(|e| {
            log::error!("[explorer::windows] Failed to create popup menu: {:?}", e);
            ExplorerError::OsError(format!("Failed to create popup menu: {:?}", e))
        })?;

        // Query the context menu to add items
        let id_cmd_first = 1;
        let id_cmd_last = 0x7FFF;
        context_menu
            .QueryContextMenu(hmenu, 0, id_cmd_first, id_cmd_last, CMF_NORMAL)
            .map_err(|e| {
                log::error!(
                    "[explorer::windows] QueryContextMenu failed: {:?}",
                    e
                );
                let _ = DestroyMenu(hmenu);
                ExplorerError::OsError(format!("Failed to query context menu: {:?}", e))
            })?;

        log::info!("[explorer::windows] Context menu populated successfully");

        // Display the menu
        let command = TrackPopupMenu(
            hmenu,
            TPM_LEFTALIGN | TPM_RETURNCMD | TPM_RIGHTBUTTON,
            point.x,
            point.y,
            0,
            hwnd,
            None,
        );

        // Clean up menu
        let _ = DestroyMenu(hmenu);

        if command == BOOL(0) {
            log::info!("[explorer::windows] User cancelled context menu");
            Ok(())
        } else {
            let command_id = command.0 as u32;
            log::info!(
                "[explorer::windows] User selected menu item: {}",
                command_id
            );

            // Convert command ID to verb (MAKEINTRESOURCE)
            // The command ID is the offset from id_cmd_first
            let verb_offset = (command_id - id_cmd_first) as *const u8;
            let lp_verb = PCSTR::from_raw(verb_offset);

            // Invoke the selected command
            let cmici = CMINVOKECOMMANDINFO {
                cbSize: std::mem::size_of::<CMINVOKECOMMANDINFO>() as u32,
                fMask: 0,
                hwnd,
                lpVerb: lp_verb,
                lpParameters: PCSTR::null(),
                lpDirectory: PCSTR::null(),
                nShow: 1i32, // SW_SHOWNORMAL
                dwHotKey: 0,
                hIcon: HANDLE::default(),
            };

            let invoke_result = context_menu.InvokeCommand(&cmici);

            if invoke_result.is_err() {
                log::error!(
                    "[explorer::windows] InvokeCommand failed: {:?}",
                    invoke_result
                );
                return Err(ExplorerError::OsError(format!(
                    "Failed to invoke command: {:?}",
                    invoke_result
                )));
            }

            log::info!("[explorer::windows] Context menu command invoked successfully");
            Ok(())
        }
    };

    // Uninitialize COM
    unsafe {
        CoUninitialize();
    }

    result
}

#[cfg(target_os = "macos")]
fn show_context_menu_macos(
    path: &str,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError> {
    log::debug!(
        "[explorer::macos] show_context_menu_macos called: path={}, x={:?}, y={:?}",
        path,
        x,
        y
    );
    // macOS implementation using objc/cocoa crates
    // This is a placeholder - full implementation requires:
    // 1. NSWorkspace or NSMenu APIs
    // 2. Objective-C runtime calls
    // 3. Menu display at coordinates
    //
    // For now, return an error indicating it's not yet implemented
    // This allows the structure to be in place for future enhancement
    log::warn!(
        "[explorer::macos] Context menu implementation not yet complete for: {}",
        path
    );
    Err(ExplorerError::OsError(
        "macOS context menu implementation not yet complete. This feature requires Objective-C runtime integration.".to_string(),
    ))
}

#[cfg(target_os = "linux")]
async fn show_context_menu_linux(
    path: &str,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError> {
    log::debug!(
        "[explorer::linux] show_context_menu_linux called: path={}, x={:?}, y={:?}",
        path,
        x,
        y
    );
    // Linux implementation using zbus crate
    // This is a placeholder - full implementation requires:
    // 1. D-Bus communication with file manager
    // 2. org.freedesktop.FileManager1.ShowItems interface
    // 3. Desktop environment specific handling
    //
    // For now, return an error indicating it's not yet implemented
    // This allows the structure to be in place for future enhancement
    log::warn!(
        "[explorer::linux] Context menu implementation not yet complete for: {}",
        path
    );
    Err(ExplorerError::OsError(
        "Linux context menu implementation not yet complete. This feature requires D-Bus integration with file managers.".to_string(),
    ))
}
