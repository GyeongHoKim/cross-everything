# Research: File Explorer Integration

**Date**: 2026-01-14  
**Feature**: File Explorer Integration (002-file-explorer-integration)

## Research Questions

1. Can Tauri v2 API open files/directories in default applications or file explorers?
2. Can Tauri v2 API show native OS context menus for files/directories?
3. If not available in Tauri, what Rust libraries exist for cross-platform file explorer and context menu operations?

## Findings

### 1. Opening Files and Directories

**Decision**: Use Tauri's `@tauri-apps/plugin-opener` (already installed)

**Rationale**:

- The project already has `@tauri-apps/plugin-opener` v2.5.3 installed
- Tauri opener plugin provides `openPath()` function that opens files with their default applications
- For directories, `openPath()` with a directory path should open it in the file explorer
- The plugin also provides `revealItemInDir()` which reveals files/directories in the file manager

**Alternatives considered**:

- `showfile` crate: Provides `show_path_in_file_manager()` but requires additional dependency
- Platform-specific shell commands: More complex and less reliable
- **Rejected**: Tauri opener plugin is already available and provides the needed functionality

**Usage Examples**:

```typescript
// Frontend (JavaScript/TypeScript)
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

// Open file with default application
await openPath("/path/to/file");

// Open directory in file explorer (should work with directory paths)
await openPath("/path/to/directory");

// Reveal item in directory
await revealItemInDir("/path/to/file");
```

```rust
// Backend (Rust)
use tauri_plugin_opener::OpenerExt;

// Open file with default application
app.opener().open_path("/path/to/file", None::<&str>);

// Open directory
app.opener().open_path("/path/to/directory", None::<&str>);
```

### 2. Native OS Context Menus

**Decision**: Implement platform-specific Rust code using system APIs

**Rationale**:

- Tauri v2's Menu API (`muda`) is for creating **custom** context menus, not showing the OS native context menu
- There is no cross-platform Rust crate that directly invokes the OS native file context menu
- Must use platform-specific APIs:
  - **Windows**: `ShellExecute` with `verb` parameter or `IContextMenu` interface
  - **macOS**: `NSWorkspace` API or `NSMenu` with system menu items
  - **Linux**: D-Bus communication with file manager (varies by desktop environment)

**Alternatives considered**:

- `muda`: Creates custom menus, not OS native menus - **Rejected**
- `wcpopup`: Custom context menu library - **Rejected**
- `tauri-plugin-context-menu`: For Tauri v1.x only - **Rejected**
- Platform-specific crates: Need to implement ourselves using conditional compilation

**Implementation Approach**:

- Create `explorer.rs` module with platform-specific implementations
- Use `#[cfg(target_os = "windows")]`, `#[cfg(target_os = "macos")]`, `#[cfg(target_os = "linux")]`
- For Windows: Use `winapi` crate to call `ShellExecute` or `IContextMenu`
- For macOS: Use `objc` crate to call `NSWorkspace` or `NSMenu` APIs
- For Linux: Use `dbus` or `zbus` crate to communicate with file manager via D-Bus

**Research Needed**:

- Specific Windows API calls for showing context menu
- Specific macOS API calls for showing context menu
- Linux D-Bus interface for file manager context menus

### 3. Rust Libraries for Platform-Specific Operations

#### Windows

- **`winapi`**: Low-level Windows API bindings
  - Can use `ShellExecute` or `IContextMenu` interface
  - Documentation: https://docs.rs/winapi
- **`windows`**: Modern Windows API crate (alternative to winapi)
  - More ergonomic API
  - Documentation: https://docs.rs/windows

#### macOS

- **`objc`**: Objective-C runtime bindings
  - Required for calling `NSWorkspace` and `NSMenu` APIs
  - Documentation: https://docs.rs/objc
- **`cocoa`**: Higher-level Cocoa bindings (uses objc)
  - More ergonomic than raw objc
  - Documentation: https://docs.rs/cocoa

#### Linux

- **`dbus`**: D-Bus client library
  - For communicating with file managers
  - Documentation: https://docs.rs/dbus
- **`zbus`**: Modern async D-Bus library (alternative to dbus)
  - More modern API
  - Documentation: https://docs.rs/zbus

**Decision**: Use platform-specific crates as needed:

- Windows: `winapi` or `windows` crate
- macOS: `objc` or `cocoa` crate
- Linux: `dbus` or `zbus` crate

### 4. Error Handling

**Decision**: Return structured error types from Rust commands, handle in React with user-friendly dialogs

**Rationale**:

- Tauri commands can return `Result<T, E>` which gets serialized to frontend
- Frontend should catch errors and show persistent dialog boxes per FR-007 and FR-008
- Need to handle:
  - File/directory doesn't exist
  - Permission denied
  - No default application found
  - OS-specific errors

**Implementation**:

```rust
#[derive(Debug, Serialize)]
pub enum ExplorerError {
    NotFound(String),
    PermissionDenied(String),
    NoDefaultApp(String),
    OsError(String),
}
```

## Open Questions Resolved

1. ✅ **Can Tauri open files/directories?** Yes, via `@tauri-apps/plugin-opener`
2. ✅ **Can Tauri show native context menus?** No, must implement platform-specific code
3. ✅ **What Rust libraries to use?** Platform-specific crates: `winapi`/`windows`, `objc`/`cocoa`, `dbus`/`zbus`

## Next Steps

1. Research specific Windows API calls for context menu (ShellExecute vs IContextMenu)
2. Research specific macOS API calls for context menu (NSWorkspace vs NSMenu)
3. Research Linux D-Bus interface specifications for file manager context menus
4. Determine which specific crates to add to `Cargo.toml`

## References

- Tauri Opener Plugin: https://tauri.app/plugin/opener
- Tauri Menu API: https://tauri.app/reference/javascript/api/namespacemenu
- Windows ShellExecute: https://docs.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecutea
- macOS NSWorkspace: https://developer.apple.com/documentation/appkit/nsworkspace
- Linux D-Bus File Manager: https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html
