// Indexing with sled

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
                    let path = e.path().unwrap_or(root_path);
                    let error_kind = e
                        .io_error()
                        .map(|io_err| format!("{:?}", io_err.kind()))
                        .unwrap_or_else(|| "unknown".to_string());
                    let error_code = e
                        .io_error()
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
                    let error_code = e
                        .raw_os_error()
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
                Ok(t) => t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
                Err(e) => {
                    let error_kind = format!("{:?}", e.kind());
                    let error_code = e
                        .raw_os_error()
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::FileEntity;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::tempdir;

    fn create_test_file_entity(
        path: &str,
        name: &str,
        size: u64,
        modified: i64,
        is_folder: bool,
    ) -> FileEntity {
        let mut hasher = Sha256::new();
        hasher.update(path.as_bytes());
        let id = format!("{:x}", hasher.finalize());

        FileEntity {
            id,
            name: name.to_string(),
            path: path.to_string(),
            size,
            modified,
            is_folder,
        }
    }

    #[test]
    fn test_index_manager_new() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");

        let manager = IndexManager::new(&db_path);
        assert!(manager.is_ok(), "IndexManager::new should succeed");

        let _manager = manager.unwrap();
        assert!(db_path.exists(), "Database directory should be created");
    }

    #[test]
    fn test_index_manager_creates_parent_dirs() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("nested").join("dirs").join("test_db");

        let manager = IndexManager::new(&db_path);
        assert!(
            manager.is_ok(),
            "IndexManager::new should create parent directories"
        );
        assert!(
            db_path.parent().unwrap().exists(),
            "Parent directories should exist"
        );
    }

    #[test]
    fn test_save_and_get_file_entity() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let entity =
            create_test_file_entity("/path/to/file.txt", "file.txt", 1024, 1234567890, false);

        let save_result = manager.save_file_entity(&entity);
        assert!(save_result.is_ok(), "save_file_entity should succeed");

        let retrieved = manager.get_file_entity(&entity.id).unwrap();
        assert!(retrieved.is_some(), "Entity should be retrievable");

        let retrieved_entity = retrieved.unwrap();
        assert_eq!(retrieved_entity.id, entity.id);
        assert_eq!(retrieved_entity.name, entity.name);
        assert_eq!(retrieved_entity.path, entity.path);
        assert_eq!(retrieved_entity.size, entity.size);
        assert_eq!(retrieved_entity.modified, entity.modified);
        assert_eq!(retrieved_entity.is_folder, entity.is_folder);
    }

    #[test]
    fn test_get_nonexistent_file_entity() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let retrieved = manager.get_file_entity("nonexistent_id").unwrap();
        assert!(retrieved.is_none(), "Nonexistent entity should return None");
    }

    #[test]
    fn test_count_files() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        assert_eq!(
            manager.count_files().unwrap(),
            0,
            "Empty database should have 0 files"
        );

        let entity1 = create_test_file_entity("/path1/file1.txt", "file1.txt", 100, 100, false);
        let entity2 = create_test_file_entity("/path2/file2.txt", "file2.txt", 200, 200, false);
        let entity3 = create_test_file_entity("/path3/file3.txt", "file3.txt", 300, 300, false);

        manager.save_file_entity(&entity1).unwrap();
        assert_eq!(manager.count_files().unwrap(), 1);

        manager.save_file_entity(&entity2).unwrap();
        assert_eq!(manager.count_files().unwrap(), 2);

        manager.save_file_entity(&entity3).unwrap();
        assert_eq!(manager.count_files().unwrap(), 3);
    }

    #[test]
    fn test_save_updates_existing_entity() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let entity1 = create_test_file_entity("/path/file.txt", "file.txt", 100, 100, false);
        manager.save_file_entity(&entity1).unwrap();

        let entity2 = create_test_file_entity("/path/file.txt", "file.txt", 500, 500, false);
        assert_eq!(
            entity1.id, entity2.id,
            "IDs should be the same for same path"
        );
        manager.save_file_entity(&entity2).unwrap();

        assert_eq!(
            manager.count_files().unwrap(),
            1,
            "Should still have 1 file after update"
        );

        let retrieved = manager.get_file_entity(&entity1.id).unwrap().unwrap();
        assert_eq!(retrieved.size, 500, "Entity should be updated");
        assert_eq!(retrieved.modified, 500, "Entity should be updated");
    }

    #[test]
    fn test_traverse_directory() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        File::create(temp_dir.path().join("file1.txt")).unwrap();
        File::create(temp_dir.path().join("file2.txt")).unwrap();
        fs::create_dir(temp_dir.path().join("subdir")).unwrap();
        File::create(temp_dir.path().join("subdir").join("file3.txt")).unwrap();

        let entities = manager.traverse_directory(temp_dir.path()).unwrap();

        let named_entities: Vec<_> = entities
            .iter()
            .filter(|e| {
                ["file1.txt", "file2.txt", "subdir", "file3.txt"].contains(&e.name.as_str())
            })
            .collect();

        assert_eq!(
            named_entities.len(),
            4,
            "Should find all files and directories"
        );

        assert!(entities
            .iter()
            .any(|e| e.name == "file1.txt" && !e.is_folder));
        assert!(entities
            .iter()
            .any(|e| e.name == "file2.txt" && !e.is_folder));
        assert!(entities.iter().any(|e| e.name == "subdir" && e.is_folder));
        assert!(entities
            .iter()
            .any(|e| e.name == "file3.txt" && !e.is_folder));
    }

    #[test]
    fn test_traverse_directory_nonexistent() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let nonexistent_path = temp_dir.path().join("nonexistent");
        let entities = manager.traverse_directory(&nonexistent_path).unwrap();

        assert_eq!(
            entities.len(),
            0,
            "Traversing nonexistent path should return empty results"
        );
    }

    #[test]
    fn test_add_or_update_file() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let file_path = temp_dir.path().join("test_file.txt");
        {
            let mut file = File::create(&file_path).unwrap();
            file.write_all(b"test content").unwrap();
        }

        let result = manager.add_or_update_file(&file_path).unwrap();
        assert!(
            result.is_some(),
            "Should return Some(entity) for existing file"
        );

        let entity = result.unwrap();
        assert_eq!(entity.name, "test_file.txt");
        assert!(!entity.is_folder);
        assert!(entity.size > 0);

        let count = manager.count_files().unwrap();
        assert_eq!(count, 1, "File should be saved to database");
    }

    #[test]
    fn test_add_or_update_nonexistent_file() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let nonexistent_path = temp_dir.path().join("nonexistent.txt");
        let result = manager.add_or_update_file(&nonexistent_path).unwrap();

        assert!(result.is_none(), "Should return None for nonexistent file");
    }

    #[test]
    fn test_remove_file() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let file_path = temp_dir.path().join("test_file.txt");
        File::create(&file_path).unwrap();

        manager.add_or_update_file(&file_path).unwrap();
        assert_eq!(manager.count_files().unwrap(), 1);

        let remove_result = manager.remove_file(&file_path);
        assert!(remove_result.is_ok(), "remove_file should succeed");

        assert_eq!(manager.count_files().unwrap(), 0, "File should be removed");
    }

    #[test]
    fn test_remove_nonexistent_file() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let nonexistent_path = temp_dir.path().join("nonexistent.txt");
        let remove_result = manager.remove_file(&nonexistent_path);

        assert!(
            remove_result.is_ok(),
            "Removing nonexistent file should not error"
        );
        assert_eq!(manager.count_files().unwrap(), 0, "Count should remain 0");
    }

    #[test]
    fn test_folder_vs_file_detection() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        File::create(temp_dir.path().join("file.txt")).unwrap();
        fs::create_dir(temp_dir.path().join("folder")).unwrap();

        let entities = manager.traverse_directory(temp_dir.path()).unwrap();

        let file = entities.iter().find(|e| e.name == "file.txt").unwrap();
        assert!(!file.is_folder, "file.txt should not be marked as folder");

        let folder = entities.iter().find(|e| e.name == "folder").unwrap();
        assert!(folder.is_folder, "folder should be marked as folder");
    }

    #[test]
    fn test_metadata_extraction() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test_db");
        let manager = IndexManager::new(&db_path).unwrap();

        let file_path = temp_dir.path().join("test.txt");
        {
            let mut file = File::create(&file_path).unwrap();
            file.write_all(b"Hello, World!").unwrap();
        }

        let entity = manager.add_or_update_file(&file_path).unwrap().unwrap();

        assert_eq!(entity.size, 13, "File size should be 13 bytes");
        assert!(entity.modified > 0, "Modified time should be positive");
    }
}
