# Data Model: File Explorer Integration

**Feature**: File Explorer Integration (002-file-explorer-integration)  
**Date**: 2026-01-14

## Overview

This feature extends the existing `FileResult` entity to support file and directory operations. No new persistent data structures are required; the feature operates on existing search result data and file system paths.

## Entities

### FileResult (Existing)

The `FileResult` entity is already defined in the codebase and represents a search result item.

**TypeScript Definition** (`src/types/search.ts`):
```typescript
export interface FileResult {
  name: string;           // File or directory name
  path: string;           // Full absolute path
  size: number;          // Size in bytes (0 for directories)
  modified: string;       // ISO 8601 date string
  is_folder: boolean;    // True if directory, false if file
}
```

**Rust Definition** (`src-tauri/src/lib.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntity {
    pub id: String,          // Hash-based unique identifier
    pub name: String,        // File or directory name
    pub path: String,        // Full absolute path
    pub size: u64,           // Size in bytes (0 for directories)
    pub modified: i64,       // Unix timestamp in seconds
    pub is_folder: bool,     // True if directory, false if file
}
```

**Validation Rules**:
- `path` MUST be an absolute path
- `path` MUST exist at the time of search (but may not exist when user interacts with it)
- `is_folder` determines whether item is a file or directory
- `size` is 0 for directories, actual byte size for files

**State Transitions**:
- **Initial**: Created during search, path exists
- **Stale**: Path no longer exists (handled by error handling)
- **Opened**: User double-clicks, file/directory opened in OS
- **Context Menu**: User right-clicks, OS context menu displayed

## Error Types

### ExplorerError (New)

Represents errors that can occur during file/directory operations.

**Rust Definition**:
```rust
#[derive(Debug, Serialize)]
pub enum ExplorerError {
    NotFound(String),           // File/directory doesn't exist
    PermissionDenied(String),  // Insufficient permissions
    NoDefaultApp(String),      // No default application found
    OsError(String),           // OS-specific error
}
```

**TypeScript Definition** (for error handling):
```typescript
export interface ExplorerError {
  kind: 'NotFound' | 'PermissionDenied' | 'NoDefaultApp' | 'OsError';
  message: string;
  path?: string;
}
```

**Error Scenarios**:
1. **NotFound**: File/directory was deleted after search results were generated
2. **PermissionDenied**: User doesn't have read/execute permissions
3. **NoDefaultApp**: File type has no associated default application
4. **OsError**: Platform-specific errors (e.g., Windows access denied, macOS quarantine)

## Relationships

- `FileResult` → File System: One-to-one mapping with actual file system entities
- `FileResult` → Operations: Each result can be opened or have context menu shown
- No database relationships (feature is stateless)

## Data Flow

1. **Search Phase**: `FileResult` entities created from search index
2. **Display Phase**: `FileResult` entities rendered in `FileList` component
3. **Interaction Phase**: 
   - Double-click → `openPath()` or `revealItemInDir()` called
   - Right-click → Platform-specific context menu API called
4. **Error Phase**: If operation fails, `ExplorerError` returned and displayed to user

## Constraints

- Paths must be absolute (enforced by existing search implementation)
- Operations are synchronous from user perspective but may be async internally
- Error handling must be user-friendly per FR-007 and FR-008
- Performance constraints: <500ms for open, <300ms for context menu (SC-003, SC-004)
