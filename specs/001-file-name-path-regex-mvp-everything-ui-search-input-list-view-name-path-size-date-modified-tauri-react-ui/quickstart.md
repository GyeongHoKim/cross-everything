# Quickstart: File Search Feature

## Prerequisites

- Node.js >= 18
- Rust and Cargo
- Tauri CLI

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   cargo build
   ```

2. **Add new dependencies to Cargo.toml**:
   ```toml
   [dependencies]
   tantivy = "0.21"
   sled = "0.34"
   notify = "6.1"
   walkdir = "2.4"
   ```

## Initial Index Build

1. **Start the application**:
   ```bash
   npm run tauri dev
   ```

2. **Trigger initial indexing** (via Tauri command or UI):
   - Call `build_index` command with desired paths (e.g., ["/Users", "/home"])
   - This will run in background and may take time for large file systems

3. **Monitor progress**:
   - Listen for `index-progress` events
   - Check status with `get_index_status` command

## Using the Search Feature

1. **Open the application**
2. **Enter search query** in the search input field:
   - Simple text: "document.pdf"
   - Regex: ".*\.jpg$" (enable regex toggle)
   - Path search: "Desktop/project"

3. **View results** in the list view:
   - Shows Name, Path, Size, Date Modified
   - Sorted by relevance

## Development

- **Backend code**: Add search logic in `src-tauri/src/search.rs`
- **Frontend components**: Update `src/components/SearchInput.tsx` and `FileList.tsx`
- **Testing**: Run `cargo test` for backend, `npm run test` for frontend

## Troubleshooting

- If search is slow, ensure indexing is complete
- Check permissions for file system access
- Verify regex syntax if using regex mode