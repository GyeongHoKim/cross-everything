// Indexing with sled

use log;
use sha2::{Digest, Sha256};
use sled::Db;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

pub struct IndexManager {
    db: Db,
}

impl IndexManager {
    pub fn new(db_path: &Path) -> Result<Self, sled::Error> {
        // Ensure the directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                sled::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to create directory: {}", e),
                ))
            })?;
        }
        let db = sled::open(db_path)?;
        Ok(IndexManager { db })
    }

    pub fn save_file_entity(&self, entity: &crate::FileEntity) -> Result<(), sled::Error> {
        let key = entity.id.as_bytes();
        let value = bincode::serialize(entity)
            .map_err(|e| sled::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
        self.db.insert(key, value)?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_file_entity(&self, id: &str) -> Result<Option<crate::FileEntity>, sled::Error> {
        if let Some(data) = self.db.get(id.as_bytes())? {
            let entity: crate::FileEntity = bincode::deserialize(&data)
                .map_err(|e| sled::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
            Ok(Some(entity))
        } else {
            Ok(None)
        }
    }

    /// Count total files in the database
    pub fn count_files(&self) -> Result<usize, sled::Error> {
        let mut count = 0;
        for _item in self.db.iter() {
            count += 1;
        }
        Ok(count)
    }

    pub fn traverse_directory(
        &self,
        root_path: &Path,
    ) -> Result<Vec<crate::FileEntity>, Box<dyn std::error::Error>> {
        let mut entities = Vec::new();
        let mut errors = 0;

        for entry in WalkDir::new(root_path).follow_links(false) {
            let entry = match entry {
                Ok(e) => e,
                Err(e) => {
                    let path = e.path().unwrap_or_else(|| root_path);
                    let error_kind = e.io_error()
                        .map(|io_err| format!("{:?}", io_err.kind()))
                        .unwrap_or_else(|| "unknown".to_string());
                    let error_code = e.io_error()
                        .and_then(|io_err| io_err.raw_os_error())
                        .map(|code| format!("os error {}", code))
                        .unwrap_or_else(|| "no error code".to_string());
                    
                    log::warn!(
                        "Failed to read directory entry at {}: {} ({}), {}",
                        path.display(),
                        e,
                        error_kind,
                        error_code
                    );
                    errors += 1;
                    continue;
                }
            };
            
            let path = entry.path();

            // Try to get metadata, skip if failed
            let metadata = match fs::metadata(path) {
                Ok(m) => m,
                Err(e) => {
                    let error_kind = format!("{:?}", e.kind());
                    let error_code = e.raw_os_error()
                        .map(|code| format!("os error {}", code))
                        .unwrap_or_else(|| "no error code".to_string());
                    
                    log::warn!(
                        "Failed to get metadata for {}: {} ({}), {}",
                        path.display(),
                        e,
                        error_kind,
                        error_code
                    );
                    errors += 1;
                    continue;
                }
            };

            let is_folder = metadata.is_dir();
            let size = if is_folder { 0 } else { metadata.len() };
            
            let modified = match metadata.modified() {
                Ok(t) => t
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                Err(e) => {
                    let error_kind = format!("{:?}", e.kind());
                    let error_code = e.raw_os_error()
                        .map(|code| format!("os error {}", code))
                        .unwrap_or_else(|| "no error code".to_string());
                    
                    log::warn!(
                        "Failed to get modified time for {}: {} ({}), {}",
                        path.display(),
                        e,
                        error_kind,
                        error_code
                    );
                    errors += 1;
                    continue;
                }
            };

            let path_str = path.to_string_lossy().to_string();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            // Generate ID from path hash
            let mut hasher = Sha256::new();
            hasher.update(path_str.as_bytes());
            let id = format!("{:x}", hasher.finalize());

            let entity = crate::FileEntity {
                id,
                name,
                path: path_str,
                size,
                modified: modified as i64,
                is_folder,
            };

            entities.push(entity);
        }

        if errors > 0 {
            log::warn!("Skipped {} entries due to errors during traversal", errors);
        }

        Ok(entities)
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn add_or_update_file(
        &self,
        path: &Path,
    ) -> Result<Option<crate::FileEntity>, Box<dyn std::error::Error>> {
        if !path.exists() {
            return Ok(None);
        }

        let metadata = fs::metadata(path)?;
        let is_folder = metadata.is_dir();
        let size = if is_folder { 0 } else { metadata.len() };
        let modified = metadata
            .modified()?
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let path_str = path.to_string_lossy().to_string();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Generate ID from path hash
        let mut hasher = Sha256::new();
        hasher.update(path_str.as_bytes());
        let id = format!("{:x}", hasher.finalize());

        let entity = crate::FileEntity {
            id,
            name,
            path: path_str,
            size,
            modified: modified as i64,
            is_folder,
        };

        self.save_file_entity(&entity)?;
        Ok(Some(entity))
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn remove_file(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let path_str = path.to_string_lossy().to_string();
        let mut hasher = Sha256::new();
        hasher.update(path_str.as_bytes());
        let id = format!("{:x}", hasher.finalize());

        self.db.remove(id.as_bytes())?;
        Ok(())
    }
}
