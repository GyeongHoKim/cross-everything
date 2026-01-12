// File watching with notify

use log;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;

#[allow(dead_code)] // Reserved for future file watcher integration
pub struct FileWatcher {
    watcher: RecommendedWatcher,
    event_receiver: mpsc::Receiver<notify::Result<Event>>,
}

impl FileWatcher {
    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn new() -> Result<Self, notify::Error> {
        let (tx, rx) = mpsc::channel();
        let watcher = notify::recommended_watcher(tx)?;

        Ok(FileWatcher {
            watcher,
            event_receiver: rx,
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
        Ok(())
    }

    #[allow(dead_code)] // Reserved for future file watcher integration
    pub fn unwatch_path(&mut self, path: &Path) -> Result<(), notify::Error> {
        self.watcher.unwatch(path)?;
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
