// File watching with notify

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc;

#[allow(dead_code)] // Reserved for future file watcher integration
pub struct FileWatcher {
    watcher: RecommendedWatcher,
    event_receiver: mpsc::Receiver<notify::Result<Event>>,
    watched_paths: HashSet<PathBuf>,
}

impl FileWatcher {
    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn new() -> Result<Self, notify::Error> {
        let (tx, rx) = mpsc::channel();
        let watcher = notify::recommended_watcher(tx)?;

        Ok(FileWatcher {
            watcher,
            event_receiver: rx,
            watched_paths: HashSet::new(),
        })
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn watch_path(&mut self, path: &Path, recursive: bool) -> Result<(), notify::Error> {
        let mode = if recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };
        self.watcher.watch(path, mode)?;
        self.watched_paths.insert(path.to_path_buf());
        Ok(())
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn unwatch_path(&mut self, path: &Path) -> Result<(), notify::Error> {
        if !self.watched_paths.contains(path) {
            return Err(notify::Error::generic("Path is not being watched"));
        }
        self.watcher.unwatch(path)?;
        self.watched_paths.remove(path);
        Ok(())
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn try_recv(&self) -> Result<Option<Event>, mpsc::TryRecvError> {
        match self.event_receiver.try_recv() {
            Ok(Ok(event)) => Ok(Some(event)),
            Ok(Err(e)) => {
                log::error!("File watcher error: {:?}", e);
                Ok(None)
            }
            Err(mpsc::TryRecvError::Empty) => Ok(None),
            Err(e) => Err(e),
        }
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn recv(&self) -> Result<Option<Event>, mpsc::RecvError> {
        match self.event_receiver.recv() {
            Ok(Ok(event)) => Ok(Some(event)),
            Ok(Err(e)) => {
                log::error!("File watcher error: {:?}", e);
                Ok(None)
            }
            Err(e) => Err(e),
        }
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)] // Reserved for future file watcher integration
pub enum FileChangeEvent {
    Created(String),
    Modified(String),
    Deleted(String),
}

impl FileWatcher {
    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn process_events(&self) -> Vec<FileChangeEvent> {
        let mut changes = Vec::new();

        // Process all available events
        loop {
            match self.try_recv() {
                Ok(Some(event)) => match event.kind {
                    EventKind::Create(_) => {
                        for path in event.paths {
                            if let Some(path_str) = path.to_str() {
                                changes.push(FileChangeEvent::Created(path_str.to_string()));
                            }
                        }
                    }
                    EventKind::Modify(_) => {
                        for path in event.paths {
                            if let Some(path_str) = path.to_str() {
                                changes.push(FileChangeEvent::Modified(path_str.to_string()));
                            }
                        }
                    }
                    EventKind::Remove(_) => {
                        for path in event.paths {
                            if let Some(path_str) = path.to_str() {
                                changes.push(FileChangeEvent::Deleted(path_str.to_string()));
                            }
                        }
                    }
                    // Rename events in notify 6.x are handled as separate Create/Remove events
                    // No special handling needed
                    _ => {}
                },
                Ok(None) => break,
                Err(_) => break,
            }
        }

        changes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use std::thread;
    use std::time::Duration;
    use tempfile::tempdir;

    fn create_test_watcher() -> FileWatcher {
        FileWatcher::new().expect("Failed to create test watcher")
    }

    #[test]
    fn test_file_watcher_new() {
        let watcher = FileWatcher::new();
        assert!(watcher.is_ok(), "FileWatcher::new should succeed");

        let watcher = watcher.unwrap();
        drop(watcher);
    }

    #[test]
    fn test_watch_path() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        let result = watcher.watch_path(temp_dir.path(), false);
        assert!(result.is_ok(), "Should be able to watch path");
    }

    #[test]
    fn test_watch_path_recursive() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        let result = watcher.watch_path(temp_dir.path(), true);
        assert!(result.is_ok(), "Should be able to watch path recursively");
    }

    #[test]
    fn test_watch_nonexistent_path() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        let nonexistent_path = temp_dir.path().join("nonexistent");
        let result = watcher.watch_path(&nonexistent_path, false);
        assert!(result.is_err(), "Should fail to watch nonexistent path");
    }

    #[test]
    fn test_unwatch_path() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path");

        let result = watcher.unwatch_path(temp_dir.path());
        assert!(result.is_ok(), "Should be able to unwatch path");
    }

    #[test]
    fn test_unwatch_non_watched_path() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        let result = watcher.unwatch_path(temp_dir.path());
        assert!(result.is_err(), "Should fail to unwatch non-watched path");
    }

    #[test]
    fn test_try_recv_no_events() {
        let watcher = create_test_watcher();

        let result = watcher.try_recv();
        assert!(result.is_ok(), "try_recv should not error");
        assert!(
            result.unwrap().is_none(),
            "Should return None when no events"
        );
    }

    #[test]
    fn test_process_events_empty() {
        let watcher = create_test_watcher();

        let events = watcher.process_events();
        assert_eq!(events.len(), 0, "Should return empty vector for no events");
    }

    #[test]
    fn test_file_change_event_variants() {
        let created = FileChangeEvent::Created("/test/file.txt".to_string());
        let modified = FileChangeEvent::Modified("/test/file.txt".to_string());
        let deleted = FileChangeEvent::Deleted("/test/file.txt".to_string());

        assert!(matches!(created, FileChangeEvent::Created(_)));
        assert!(matches!(modified, FileChangeEvent::Modified(_)));
        assert!(matches!(deleted, FileChangeEvent::Deleted(_)));
    }

    #[test]
    fn test_detect_file_creation() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path");

        thread::sleep(Duration::from_millis(100));

        let file_path = temp_dir.path().join("test.txt");
        File::create(&file_path).expect("Should be able to create test file");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();
        assert!(!events.is_empty(), "Should detect file creation event");

        assert!(
            events
                .iter()
                .any(|e| matches!(e, FileChangeEvent::Created(path) if path.contains("test.txt"))),
            "Should find FileChangeEvent::Created for test.txt"
        );
    }

    #[test]
    fn test_detect_file_modification() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path");

        let file_path = temp_dir.path().join("test.txt");
        {
            let mut file = File::create(&file_path).expect("Should create file");
            writeln!(file, "initial content").expect("Should write initial content");
        }

        thread::sleep(Duration::from_millis(200));

        {
            let mut file = File::create(&file_path).expect("Should open file");
            writeln!(file, "modified content").expect("Should write modified content");
            file.sync_all().expect("Should sync to disk");
        }

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();

        assert!(
            events
                .iter()
                .any(|e| matches!(e, FileChangeEvent::Modified(path) if path.contains("test.txt"))),
            "Should find FileChangeEvent::Modified for test.txt"
        );
    }

    #[test]
    fn test_detect_file_deletion() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path");

        let file_path = temp_dir.path().join("test.txt");
        File::create(&file_path).expect("Should create file");

        thread::sleep(Duration::from_millis(100));

        fs::remove_file(&file_path).expect("Should be able to delete file");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();
        assert!(
            events
                .iter()
                .any(|e| matches!(e, FileChangeEvent::Deleted(path) if path.contains("test.txt"))),
            "Should find FileChangeEvent::Deleted for test.txt"
        );
    }

    #[test]
    fn test_detect_multiple_events() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path");

        thread::sleep(Duration::from_millis(100));

        let file1 = temp_dir.path().join("file1.txt");
        let file2 = temp_dir.path().join("file2.txt");

        File::create(&file1).expect("Should create file1");
        File::create(&file2).expect("Should create file2");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();

        let created_count = events
            .iter()
            .filter(|e| matches!(e, FileChangeEvent::Created(_)))
            .count();

        assert!(
            created_count >= 2,
            "Should detect at least 2 file creation events"
        );
    }

    #[test]
    fn test_recursive_watching() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), true)
            .expect("Should be able to watch path recursively");

        let subdir = temp_dir.path().join("subdir");
        fs::create_dir(&subdir).expect("Should create subdirectory");

        thread::sleep(Duration::from_millis(100));

        let file_path = subdir.join("nested.txt");
        File::create(&file_path).expect("Should create nested file");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();

        assert!(
            events.iter().any(
                |e| matches!(e, FileChangeEvent::Created(path) if path.contains("nested.txt"))
            ),
            "Should detect file creation in subdirectory with recursive watch"
        );
    }

    #[test]
    fn test_non_recursive_watching() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        watcher
            .watch_path(temp_dir.path(), false)
            .expect("Should be able to watch path non-recursively");

        let subdir = temp_dir.path().join("subdir");
        fs::create_dir(&subdir).expect("Should create subdirectory");

        thread::sleep(Duration::from_millis(100));

        let file_path = subdir.join("nested.txt");
        File::create(&file_path).expect("Should create nested file");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();

        let nested_event = events
            .iter()
            .find(|e| matches!(e, FileChangeEvent::Created(path) if path.contains("nested.txt")));

        assert!(
            nested_event.is_none(),
            "Should NOT detect file creation in subdirectory with non-recursive watch (or behavior may vary by OS)"
        );
    }

    #[test]
    fn test_watcher_with_multiple_watches() {
        let temp_dir = tempdir().unwrap();
        let mut watcher = create_test_watcher();

        let dir1 = temp_dir.path().join("dir1");
        let dir2 = temp_dir.path().join("dir2");
        fs::create_dir(&dir1).expect("Should create dir1");
        fs::create_dir(&dir2).expect("Should create dir2");

        watcher
            .watch_path(&dir1, false)
            .expect("Should be able to watch dir1");
        watcher
            .watch_path(&dir2, false)
            .expect("Should be able to watch dir2");

        thread::sleep(Duration::from_millis(100));

        File::create(dir1.join("file1.txt")).expect("Should create file in dir1");
        File::create(dir2.join("file2.txt")).expect("Should create file in dir2");

        thread::sleep(Duration::from_millis(200));

        let events = watcher.process_events();

        assert!(
            events
                .iter()
                .any(|e| matches!(e, FileChangeEvent::Created(path) if path.contains("file1.txt"))),
            "Should detect file in dir1"
        );
        assert!(
            events
                .iter()
                .any(|e| matches!(e, FileChangeEvent::Created(path) if path.contains("file2.txt"))),
            "Should detect file in dir2"
        );
    }
}
