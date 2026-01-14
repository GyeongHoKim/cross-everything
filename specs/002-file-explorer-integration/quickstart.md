# Quickstart: File Explorer Integration

**Feature**: File Explorer Integration (002-file-explorer-integration)  
**Date**: 2026-01-14

## Prerequisites

- Node.js >= 18
- Rust 1.70+ and Cargo
- Tauri CLI v2
- Existing file search feature (001) must be working

## Implementation Approach: TDD

This feature follows **Test-Driven Development (TDD)**:
1. Write unit tests first (both frontend and backend)
2. Run tests (they should fail)
3. Implement functionality to pass tests
4. Refactor if needed
5. Verify all tests pass and lint checks pass

## Setup

### 1. Install Dependencies

**Frontend**: No new dependencies needed (uses existing `@tauri-apps/plugin-opener`)

**Backend**: Add platform-specific crates to `src-tauri/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...
tauri-plugin-opener = "2"

# Platform-specific dependencies for context menu
[target.'cfg(target_os = "windows")'.dependencies]
winapi = { version = "0.3", features = ["shellapi", "winuser"] }

[target.'cfg(target_os = "macos")'.dependencies]
objc = "0.2"
cocoa = "0.25"

[target.'cfg(target_os = "linux")'.dependencies]
zbus = "3.14"
```

### 2. Update Tauri Capabilities

Ensure `src-tauri/capabilities/default.json` includes:

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

## Implementation Steps

### Step 1: Write Backend Tests

Create `src-tauri/tests/explorer_test.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_open_file_or_directory_with_valid_file() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        fs::write(&test_file, "test content").unwrap();
        
        // Test implementation here
        // Should open file with default application
    }

    #[tokio::test]
    async fn test_open_file_or_directory_with_valid_directory() {
        let temp_dir = TempDir::new().unwrap();
        
        // Test implementation here
        // Should open directory in file explorer
    }

    #[tokio::test]
    async fn test_open_file_or_directory_with_nonexistent_path() {
        // Test implementation here
        // Should return NotFound error
    }

    #[tokio::test]
    async fn test_show_context_menu_with_valid_path() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        fs::write(&test_file, "test content").unwrap();
        
        // Test implementation here
        // Should show context menu (may need to mock OS APIs)
    }
}
```

### Step 2: Implement Backend Commands

Create `src-tauri/src/explorer.rs`:

```rust
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub enum ExplorerError {
    NotFound(String),
    PermissionDenied(String),
    NoDefaultApp(String),
    OsError(String),
}

#[tauri::command]
pub async fn open_file_or_directory(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), ExplorerError> {
    // Validate path exists
    if !Path::new(&path).exists() {
        return Err(ExplorerError::NotFound(path));
    }
    
    // Use tauri-plugin-opener
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| ExplorerError::OsError(e.to_string()))?;
    
    Ok(())
}

#[tauri::command]
pub async fn show_context_menu(
    app: tauri::AppHandle,
    path: String,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), ExplorerError> {
    // Platform-specific implementation
    #[cfg(target_os = "windows")]
    {
        show_context_menu_windows(&path, x, y)?;
    }
    
    #[cfg(target_os = "macos")]
    {
        show_context_menu_macos(&path, x, y)?;
    }
    
    #[cfg(target_os = "linux")]
    {
        show_context_menu_linux(&path, x, y).await?;
    }
    
    Ok(())
}

// Platform-specific implementations...
```

### Step 3: Register Commands

Update `src-tauri/src/lib.rs`:

```rust
mod explorer;

// In the run() function:
tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    // ... other plugins
    .invoke_handler(tauri::generate_handler![
        // ... existing commands
        explorer::open_file_or_directory,
        explorer::show_context_menu,
    ])
    // ...
```

### Step 4: Write Frontend Tests

Update `src/components/FileList.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileList from './FileList';
import * as opener from '@tauri-apps/plugin-opener';

vi.mock('@tauri-apps/plugin-opener');

describe('FileList', () => {
  it('should open file on double-click', async () => {
    const mockOpenPath = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(opener, 'openPath').mockImplementation(mockOpenPath);
    
    const results = [{
      name: 'test.txt',
      path: '/path/to/test.txt',
      size: 100,
      modified: '2026-01-14T00:00:00Z',
      is_folder: false,
    }];
    
    render(<FileList results={results} />);
    
    const row = screen.getByText('test.txt').closest('tr');
    fireEvent.doubleClick(row!);
    
    expect(mockOpenPath).toHaveBeenCalledWith('/path/to/test.txt');
  });

  it('should show context menu on right-click', async () => {
    // Test implementation
  });
});
```

### Step 5: Create Frontend Hook

Create `src/hooks/useFileExplorer.ts`:

```typescript
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ExplorerError } from '../types/explorer';

export function useFileExplorer() {
  const [error, setError] = useState<ExplorerError | null>(null);
  const [loading, setLoading] = useState(false);

  const openFileOrDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      await invoke('open_file_or_directory', { path });
    } catch (err) {
      setError(err as ExplorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const showContextMenu = useCallback(async (
    path: string,
    x?: number,
    y?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      await invoke('show_context_menu', { path, x, y });
    } catch (err) {
      setError(err as ExplorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { openFileOrDirectory, showContextMenu, error, loading };
}
```

### Step 6: Update FileList Component

Update `src/components/FileList.tsx`:

```typescript
import { useFileExplorer } from '../hooks/useFileExplorer';

export default function FileList({ results, loading = false }: FileListProps) {
  const { openFileOrDirectory, showContextMenu } = useFileExplorer();

  const handleDoubleClick = async (file: FileResult) => {
    try {
      await openFileOrDirectory(file.path);
    } catch (error) {
      // Show error dialog
      console.error('Failed to open:', error);
    }
  };

  const handleRightClick = async (
    file: FileResult,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    try {
      await showContextMenu(file.path, event.clientX, event.clientY);
    } catch (error) {
      // Show error dialog
      console.error('Failed to show context menu:', error);
    }
  };

  return (
    <section className="file-list-container">
      <table className="file-list-table">
        <tbody>
          {results.map((file, index) => (
            <tr
              key={`${file.path}-${index}`}
              onDoubleClick={() => handleDoubleClick(file)}
              onContextMenu={(e) => handleRightClick(file, e)}
              // ... existing props
            >
              {/* ... existing content */}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

## Testing

### Run Tests

**Backend**:
```bash
cd src-tauri
cargo test explorer_test
```

**Frontend**:
```bash
npm run test:front
```

**All Tests**:
```bash
npm run test
```

### Verify Quality Gates

```bash
# Format and lint
npm run check
npm run typecheck

# Rust format and lint
npm run format:core
npm run lint:core
```

## Usage

Once implemented:

1. **Double-click a file**: Opens with default application
2. **Double-click a directory**: Opens in file explorer
3. **Right-click a file/directory**: Shows native OS context menu

## Troubleshooting

### Context Menu Not Showing

- Verify platform-specific dependencies are installed
- Check OS permissions
- Review platform-specific implementation in `explorer.rs`

### Files Not Opening

- Verify `opener:allow-open-path` permission in capabilities
- Check file path is absolute
- Verify file exists and is accessible

### Tests Failing

- Ensure all dependencies are installed
- Check test setup (tempfile, tokio)
- Verify mocks are properly configured

## Next Steps

After implementation:
1. Run all tests and verify they pass
2. Run lint checks and fix any errors
3. Test on all target platforms (Windows, macOS, Linux)
4. Update documentation if needed
