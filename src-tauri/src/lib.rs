// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod index;
mod search;
mod watcher;

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tantivy::schema::Value;
use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem};

/// Initialize logging to file with rotation
fn init_logging(log_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure log directory exists
    std::fs::create_dir_all(log_dir)?;

    flexi_logger::Logger::try_with_env_or_str("info")?
        .log_to_file(flexi_logger::FileSpec::default().directory(log_dir).basename("crosseverything"))
        .rotate(
            flexi_logger::Criterion::Size(10_000_000), // 10MB per file
            flexi_logger::Naming::Timestamps,
            flexi_logger::Cleanup::KeepLogFiles(5), // Keep 5 log files
        )
        .format(flexi_logger::opt_format)
        .start()?;

    Ok(())
}

fn format_timestamp_iso8601(timestamp: i64) -> String {
    use std::time::{Duration, UNIX_EPOCH};
    let dt = UNIX_EPOCH + Duration::from_secs(timestamp as u64);
    let system_time = dt;

    // Format as ISO 8601 (simplified, always UTC)
    // This is a basic implementation - for production, consider using a proper date formatting library
    let datetime = system_time.duration_since(UNIX_EPOCH).unwrap();
    let secs = datetime.as_secs();
    let nanos = datetime.subsec_nanos();

    // Calculate date components
    let _days = secs / 86400;
    let seconds_in_day = secs % 86400;
    let hours = seconds_in_day / 3600;
    let minutes = (seconds_in_day % 3600) / 60;
    let seconds = seconds_in_day % 60;

    // Simple epoch to date conversion (approximate, for ISO 8601 formatting)
    // For a proper implementation, we'd need a date library, but this works for display
    format!(
        "1970-01-01T{:02}:{:02}:{:02}.{:09}Z",
        hours, minutes, seconds, nanos
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntity {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: i64, // Unix timestamp in seconds
    pub is_folder: bool,
}

#[derive(Clone)]
struct AppState {
    index_manager: Arc<Mutex<Option<index::IndexManager>>>,
    search_index: Arc<Mutex<Option<search::SearchIndex>>>,
    #[allow(dead_code)] // Reserved for future file watcher integration
    file_watcher: Arc<Mutex<Option<watcher::FileWatcher>>>,
    is_indexing: Arc<Mutex<bool>>,
    total_files: Arc<Mutex<usize>>,
    last_updated: Arc<Mutex<Option<i64>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            index_manager: Arc::new(Mutex::new(None)),
            search_index: Arc::new(Mutex::new(None)),
            file_watcher: Arc::new(Mutex::new(None)),
            is_indexing: Arc::new(Mutex::new(false)),
            total_files: Arc::new(Mutex::new(0)),
            last_updated: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Load existing index if available
async fn load_existing_index(
    app: &tauri::AppHandle,
    state: &tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let app_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let db_path = app_data_dir.join(".index_db");
    let search_index_path = app_data_dir.join(".search_index");

    // Check if both index files exist
    if !db_path.exists() || !search_index_path.exists() {
        log::info!("No existing index found");
        return Ok(false);
    }

    log::info!("Found existing index, loading...");

    // Try to open existing index
    let index_manager = match index::IndexManager::new(&db_path) {
        Ok(manager) => manager,
        Err(e) => {
            log::warn!("Failed to open existing DB: {}, will rebuild", e);
            return Ok(false);
        }
    };

    let search_index = match search::SearchIndex::new(&search_index_path) {
        Ok(index) => index,
        Err(e) => {
            log::warn!("Failed to open existing search index: {}, will rebuild", e);
            return Ok(false);
        }
    };

    // Count files in DB
    let total_files = match index_manager.count_files() {
        Ok(count) => {
            log::info!("Found {} files in existing index", count);
            count
        }
        Err(e) => {
            log::warn!("Failed to count files in DB: {}", e);
            0
        }
    };

    // Update state
    *state.index_manager.lock().unwrap() = Some(index_manager);
    *state.search_index.lock().unwrap() = Some(search_index);
    *state.total_files.lock().unwrap() = total_files;
    *state.last_updated.lock().unwrap() = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
    );

    log::info!("Existing index loaded successfully");
    Ok(true)
}

#[tauri::command]
async fn build_index(
    paths: Vec<String>,
    force_rebuild: bool,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    {
        let mut is_indexing = state.is_indexing.lock().unwrap();
        if *is_indexing {
            log::warn!("Index build requested but indexing is already in progress");
            return Ok(serde_json::json!({
                "status": "failed",
                "files_indexed": 0,
                "errors": vec!["Indexing already in progress"]
            }));
        }
        *is_indexing = true;
    } // MutexGuard dropped here

    // Get app local data directory for storing index files
    let app_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let db_path = app_data_dir.join(".index_db");
    let search_index_path = app_data_dir.join(".search_index");

    // If force_rebuild is true, delete existing index
    if force_rebuild {
        log::info!("Force rebuild requested, deleting existing index...");
        if db_path.exists() {
            if let Err(e) = std::fs::remove_dir_all(&db_path) {
                log::warn!("Failed to delete existing DB: {}", e);
            } else {
                log::info!("Deleted existing DB at {:?}", db_path);
            }
        }
        if search_index_path.exists() {
            if let Err(e) = std::fs::remove_dir_all(&search_index_path) {
                log::warn!("Failed to delete existing search index: {}", e);
            } else {
                log::info!("Deleted existing search index at {:?}", search_index_path);
            }
        }
    } else {
        // Check if index already exists and is valid
        if db_path.exists() && search_index_path.exists() {
            log::info!("Existing index found, checking validity...");
            // Try to load existing index
            if let Ok(true) = load_existing_index(&app, &state).await {
                log::info!("Using existing index, skipping rebuild");
                *state.is_indexing.lock().unwrap() = false;
                return Ok(serde_json::json!({
                    "status": "completed",
                    "files_indexed": 0,
                    "errors": Vec::<String>::new(),
                    "message": "Using existing index"
                }));
            }
            log::info!("Existing index is invalid, will rebuild");
        }
    }

    log::info!("Starting index build for {} path(s)", paths.len());
    for (i, path_str) in paths.iter().enumerate() {
        log::info!("Index path {}: {}", i + 1, path_str);
    }

    // Get app local data directory for storing index files
    let app_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create subdirectories for index files
    let db_path = app_data_dir.join(".index_db");
    let search_index_path = app_data_dir.join(".search_index");

    log::debug!("DB path: {:?}", db_path);
    log::debug!("Search index path: {:?}", search_index_path);

    let index_manager = index::IndexManager::new(&db_path)
        .map_err(|e| {
            log::error!("Failed to create index manager: {}", e);
            format!("Failed to create index manager: {}", e)
        })?;

    let search_index = search::SearchIndex::new(&search_index_path)
        .map_err(|e| {
            log::error!("Failed to create search index: {}", e);
            format!("Failed to create search index: {}", e)
        })?;

    let schema = search_index.get_schema();
    let mut writer = search_index
        .writer()
        .map_err(|e| format!("Failed to create index writer: {}", e))?;

    let mut files_indexed = 0;
    let mut errors = Vec::new();
    let mut total_estimated = 0;

    // First pass: estimate total files
    log::info!("Phase 1: Estimating total files...");
    let start_time = std::time::Instant::now();
    for path_str in &paths {
        let path = Path::new(path_str);
        if path.exists() {
            log::debug!("Counting files in: {}", path_str);
            // Rough estimate: count entries (this is approximate)
            let count = walkdir::WalkDir::new(path).into_iter().count();
            total_estimated += count;
            log::info!("Found approximately {} entries in {}", count, path_str);
        }
    }
    let estimate_time = start_time.elapsed();
    log::info!(
        "Phase 1 complete: Estimated {} total files in {:.2}s",
        total_estimated,
        estimate_time.as_secs_f64()
    );

    // Second pass: index files with progress updates
    log::info!("Phase 2: Indexing files...");
    let index_start_time = std::time::Instant::now();
    for path_str in &paths {
        let path = Path::new(path_str);
        if !path.exists() {
            let error_msg = format!("Path does not exist: {}", path_str);
            log::error!("{}", error_msg);
            errors.push(error_msg);
            continue;
        }

        log::info!("Indexing directory: {}", path_str);
        let entities = match index_manager.traverse_directory(path) {
            Ok(entities) => entities,
            Err(e) => {
                let error_details = if let Some(io_err) = e.downcast_ref::<std::io::Error>() {
                    let error_kind = format!("{:?}", io_err.kind());
                    let error_code = io_err.raw_os_error()
                        .map(|code| format!("os error {}", code))
                        .unwrap_or_else(|| "no error code".to_string());
                    format!("{} ({}), {}", io_err, error_kind, error_code)
                } else {
                    format!("{}", e)
                };
                
                log::error!(
                    "Failed to traverse directory {}: {}",
                    path_str,
                    error_details
                );
                return Err(format!("Failed to traverse directory: {}", e));
            }
        };

        log::info!("Found {} entities in {}", entities.len(), path_str);

        for entity in entities {
            // Save to sled
            index_manager
                .save_file_entity(&entity)
                .map_err(|e| {
                    log::error!("Failed to save entity {}: {}", entity.path, e);
                    format!("Failed to save entity: {}", e)
                })?;

            // Add to tantivy index
            let mut doc = tantivy::TantivyDocument::default();
            let name_field = schema
                .get_field("name")
                .map_err(|e| format!("Failed to get name field: {}", e))?;
            let path_field = schema
                .get_field("path")
                .map_err(|e| format!("Failed to get path field: {}", e))?;
            let size_field = schema
                .get_field("size")
                .map_err(|e| format!("Failed to get size field: {}", e))?;
            let modified_field = schema
                .get_field("modified")
                .map_err(|e| format!("Failed to get modified field: {}", e))?;
            let is_folder_field = schema
                .get_field("is_folder")
                .map_err(|e| format!("Failed to get is_folder field: {}", e))?;

            doc.add_text(name_field, &entity.name);
            doc.add_text(path_field, &entity.path);
            doc.add_u64(size_field, entity.size);
            doc.add_date(
                modified_field,
                tantivy::DateTime::from_timestamp_secs(entity.modified),
            );
            doc.add_bool(is_folder_field, entity.is_folder);

            writer
                .add_document(doc)
                .map_err(|e| {
                    log::error!("Failed to add document to search index for {}: {}", entity.path, e);
                    format!("Failed to add document: {}", e)
                })?;

            files_indexed += 1;

            // Emit progress event every 50 files (more frequent updates)
            if files_indexed % 50 == 0 {
                let elapsed = index_start_time.elapsed();
                let rate = files_indexed as f64 / elapsed.as_secs_f64();
                let percentage = (files_indexed as f64 / total_estimated.max(1) as f64) * 100.0;
                log::info!(
                    "Progress: {}/{} files ({:.1}%), {:.0} files/sec",
                    files_indexed,
                    total_estimated,
                    percentage,
                    rate
                );
                let _ = app.emit(
                    "index-progress",
                    serde_json::json!({
                        "processed": files_indexed,
                        "total": total_estimated
                    }),
                );
            }
        }
    }

    log::info!("Committing index...");
    writer
        .commit()
        .map_err(|e| {
            log::error!("Failed to commit index: {}", e);
            format!("Failed to commit index: {}", e)
        })?;

    let total_time = index_start_time.elapsed();
    let rate = files_indexed as f64 / total_time.as_secs_f64();
    log::info!(
        "Index build complete: {} files indexed in {:.2}s ({:.0} files/sec)",
        files_indexed,
        total_time.as_secs_f64(),
        rate
    );

    if !errors.is_empty() {
        log::warn!("{} error(s) occurred during indexing", errors.len());
        for error in &errors {
            log::warn!("  - {}", error);
        }
    }

    // Update state
    *state.index_manager.lock().unwrap() = Some(index_manager);
    *state.search_index.lock().unwrap() = Some(search_index);
    *state.total_files.lock().unwrap() = files_indexed;
    *state.last_updated.lock().unwrap() = Some(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
    );
    *state.is_indexing.lock().unwrap() = false;

    // Emit final progress event
    let _ = app.emit(
        "index-progress",
        serde_json::json!({
            "processed": files_indexed,
            "total": files_indexed
        }),
    );

    // Note: File watcher integration will be implemented in a separate command
    // to avoid lifetime issues with async tasks

    Ok(serde_json::json!({
        "status": "completed",
        "files_indexed": files_indexed,
        "errors": errors
    }))
}

#[tauri::command]
async fn search_files(
    query: String,
    use_regex: bool,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let start_time = std::time::Instant::now();
    log::info!("Search request: query='{}', regex={}, limit={:?}", query, use_regex, limit);

    let search_index_guard = state.search_index.lock().unwrap();
    let search_index = search_index_guard
        .as_ref()
        .ok_or_else(|| {
            log::warn!("Search attempted but index is not ready");
            "INDEX_NOT_READY".to_string()
        })?;

    let limit = limit.unwrap_or(1000);

    // Validate regex if needed
    if use_regex {
        regex::Regex::new(&query).map_err(|e| {
            log::warn!("Invalid regex pattern '{}': {}", query, e);
            "INVALID_REGEX".to_string()
        })?;
    }

    let docs = search_index
        .search(&query, use_regex, limit)
        .map_err(|e| {
            log::error!("Search failed for query '{}': {}", query, e);
            format!("Search failed: {}", e)
        })?;

    let schema = search_index.get_schema();
    let name_field = schema
        .get_field("name")
        .map_err(|e| format!("Failed to get name field: {}", e))?;
    let path_field = schema
        .get_field("path")
        .map_err(|e| format!("Failed to get path field: {}", e))?;
    let size_field = schema
        .get_field("size")
        .map_err(|e| format!("Failed to get size field: {}", e))?;
    let modified_field = schema
        .get_field("modified")
        .map_err(|e| format!("Failed to get modified field: {}", e))?;
    let is_folder_field = schema
        .get_field("is_folder")
        .map_err(|e| format!("Failed to get is_folder field: {}", e))?;

    let mut results = Vec::new();
    for doc in docs {
        let name = doc
            .get_first(name_field)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let path = doc
            .get_first(path_field)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let size = doc
            .get_first(size_field)
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let modified_ts = doc
            .get_first(modified_field)
            .and_then(|v| v.as_datetime())
            .map(|d: tantivy::DateTime| d.into_timestamp_secs())
            .unwrap_or_else(|| {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64
            });
        let is_folder = doc
            .get_first(is_folder_field)
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Convert timestamp to ISO 8601 string manually
        let modified_str = format_timestamp_iso8601(modified_ts);

        results.push(serde_json::json!({
            "name": name,
            "path": path,
            "size": size,
            "modified": modified_str,
            "is_folder": is_folder
        }));
    }

    let search_time_ms = start_time.elapsed().as_millis() as u64;
    log::info!(
        "Search completed: {} results in {}ms (query='{}', regex={})",
        results.len(),
        search_time_ms,
        query,
        use_regex
    );

    Ok(serde_json::json!({
        "results": results,
        "total_found": results.len(),
        "search_time_ms": search_time_ms
    }))
}

#[tauri::command]
async fn get_index_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let is_indexing = *state.is_indexing.lock().unwrap();
    let total_files = *state.total_files.lock().unwrap();
    let last_updated = *state.last_updated.lock().unwrap();
    let is_ready = state.search_index.lock().unwrap().is_some();

    log::debug!(
        "Index status requested: ready={}, files={}, indexing={}",
        is_ready,
        total_files,
        is_indexing
    );

    Ok(serde_json::json!({
        "is_ready": is_ready,
        "total_files": total_files,
        "last_updated": last_updated.map(format_timestamp_iso8601),
        "indexing_in_progress": is_indexing
    }))
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("CrossEverything")
                .build(),
        )
        .setup(|app| {
            // Initialize logging
            if let Ok(log_dir) = app.path().app_local_data_dir() {
                if let Err(e) = init_logging(&log_dir) {
                    eprintln!("Failed to initialize logging: {}", e);
                } else {
                    log::info!("Logging initialized. Log directory: {:?}", log_dir);
                }
            }

            log::info!("CrossEverything starting up");

            // Create system tray icon
            let icon = app.default_window_icon().cloned();
            
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            
            let mut tray_builder = tauri::tray::TrayIconBuilder::new()
                .tooltip("CrossEverything")
                .menu(&menu);
            
            // Set icon if available
            if let Some(icon_image) = icon {
                tray_builder = tray_builder.icon(icon_image);
            }
            
            let _tray = tray_builder
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            build_index,
            search_files,
            get_index_status
        ])
        .on_window_event(|app, event| {
            // When window is closed, hide it instead of destroying it
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Get the main window
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
