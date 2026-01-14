# Explorer API Contracts

**Feature**: File Explorer Integration (002-file-explorer-integration)  
**Date**: 2026-01-14

## Overview

This document defines the API contracts for file and directory operations in the file explorer integration feature. These contracts define the interface between the React frontend and Rust backend via Tauri commands.

## Tauri Commands

### 1. Open File or Directory

Opens a file with its default application or opens a directory in the file explorer.

**Command Name**: `open_file_or_directory`

**Rust Signature**:
```rust
#[tauri::command]
async fn open_file_or_directory(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), ExplorerError>
```

**TypeScript Invocation**:
```typescript
import { invoke } from "@tauri-apps/api/core";

await invoke("open_file_or_directory", { path: "/path/to/file" });
```

**Input**:
- `path` (string, required): Absolute path to file or directory

**Output**:
- Success: `void` (no return value)
- Error: `ExplorerError` (serialized as JSON)

**Behavior**:
- If `path` is a file: Opens with default application using `tauri-plugin-opener`
- If `path` is a directory: Opens in file explorer using `tauri-plugin-opener`
- Returns `NotFound` error if path doesn't exist
- Returns `PermissionDenied` error if access is denied
- Returns `NoDefaultApp` error if file has no default application
- Returns `OsError` for other OS-specific errors

**Error Handling**:
- Frontend must catch errors and display persistent dialog per FR-007 and FR-008
- Error messages should be user-friendly and actionable

**Performance**: Must complete within 500ms for valid paths (SC-003)

---

### 2. Show Context Menu

Shows the native OS context menu for a file or directory.

**Command Name**: `show_context_menu`

**Rust Signature**:
```rust
#[tauri::command]
async fn show_context_menu(
    app: tauri::AppHandle,
    path: String,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError>
```

**TypeScript Invocation**:
```typescript
import { invoke } from "@tauri-apps/api/core";

await invoke("show_context_menu", { 
  path: "/path/to/file",
  x: 100,  // Optional: X coordinate relative to window
  y: 200,  // Optional: Y coordinate relative to window
});
```

**Input**:
- `path` (string, required): Absolute path to file or directory
- `x` (number, optional): X coordinate for menu position (relative to window)
- `y` (number, optional): Y coordinate for menu position (relative to window)

**Output**:
- Success: `void` (no return value)
- Error: `ExplorerError` (serialized as JSON)

**Behavior**:
- Shows native OS context menu at specified coordinates (or mouse position if not provided)
- Platform-specific implementation:
  - **Windows**: Uses `ShellExecute` or `IContextMenu` interface
  - **macOS**: Uses `NSWorkspace` or `NSMenu` API
  - **Linux**: Uses D-Bus to communicate with file manager
- Returns `NotFound` error if path doesn't exist
- Returns `PermissionDenied` error if access is denied
- Returns `OsError` for other OS-specific errors

**Error Handling**:
- Frontend must catch errors and display persistent dialog per FR-007 and FR-008
- Error messages should be user-friendly and actionable

**Performance**: Must complete within 300ms for valid paths (SC-004)

---

## Error Types

### ExplorerError

**Rust Definition**:
```rust
#[derive(Debug, Serialize)]
pub enum ExplorerError {
    NotFound(String),           // Path doesn't exist
    PermissionDenied(String),  // Insufficient permissions
    NoDefaultApp(String),      // No default application
    OsError(String),           // OS-specific error
}
```

**TypeScript Definition**:
```typescript
export interface ExplorerError {
  kind: 'NotFound' | 'PermissionDenied' | 'NoDefaultApp' | 'OsError';
  message: string;
  path?: string;
}
```

**Error Codes**:
- `NotFound`: File/directory was deleted or moved
- `PermissionDenied`: User lacks required permissions
- `NoDefaultApp`: File type has no associated application
- `OsError`: Platform-specific error (includes error message)

---

## Frontend API (React Hooks)

### useFileExplorer Hook

Custom React hook for file/directory operations.

**TypeScript Definition**:
```typescript
export interface UseFileExplorerReturn {
  openFileOrDirectory: (path: string) => Promise<void>;
  showContextMenu: (path: string, x?: number, y?: number) => Promise<void>;
  error: ExplorerError | null;
  loading: boolean;
}

export function useFileExplorer(): UseFileExplorerReturn;
```

**Usage**:
```typescript
const { openFileOrDirectory, showContextMenu, error, loading } = useFileExplorer();

// Open file/directory
await openFileOrDirectory('/path/to/file');

// Show context menu
await showContextMenu('/path/to/file', 100, 200);
```

**Error Handling**:
- Hook manages error state internally
- Errors are exposed via `error` property
- Frontend components should display errors in persistent dialogs

---

## Event Handlers

### FileList Component Events

**Double-Click Handler**:
```typescript
const handleDoubleClick = async (file: FileResult) => {
  try {
    await openFileOrDirectory(file.path);
  } catch (error) {
    // Display error dialog
  }
};
```

**Right-Click Handler**:
```typescript
const handleRightClick = async (file: FileResult, event: React.MouseEvent) => {
  event.preventDefault();
  try {
    await showContextMenu(file.path, event.clientX, event.clientY);
  } catch (error) {
    // Display error dialog
  }
};
```

---

## Permissions

### Tauri Capabilities

The following permissions are required in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "opener:allow-open-path",
    "core:path:default"
  ]
}
```

**Note**: The `opener:allow-open-path` permission may need to be scoped to specific paths or use wildcards depending on security requirements.

---

## Testing Contracts

### Unit Test Requirements

**Frontend Tests** (`FileList.test.tsx`):
- Test double-click handler calls `openFileOrDirectory`
- Test right-click handler calls `showContextMenu`
- Test error handling displays dialogs
- Test loading states

**Backend Tests** (`explorer_test.rs`):
- Test `open_file_or_directory` with valid files
- Test `open_file_or_directory` with valid directories
- Test `open_file_or_directory` with non-existent paths
- Test `open_file_or_directory` with permission errors
- Test `show_context_menu` with valid paths
- Test `show_context_menu` with non-existent paths
- Test platform-specific implementations (Windows, macOS, Linux)

**Integration Tests**:
- Test end-to-end flow: search → double-click → file opens
- Test end-to-end flow: search → right-click → context menu shows
- Test error scenarios with actual file system

---

## Version History

- **v1.0.0** (2026-01-14): Initial API contract definition
