# Data Model

## Entities

### FileEntity

Represents a file or folder in the search index.

**Fields**:
- `id`: String - Unique identifier (hash of path)
- `name`: String - File or folder name
- `path`: String - Absolute path
- `size`: u64 - Size in bytes (0 for folders)
- `modified`: DateTime<Utc> - Last modification time
- `is_folder`: bool - True if directory, false if file

**Validation Rules**:
- `path` must be absolute and valid file system path
- `size` must be >= 0
- `modified` must be valid DateTime
- `name` must not be empty

### SearchIndex

Managed by tantivy search engine.

**Indexed Fields**:
- `name`: Text field for file/folder name
- `path`: Text field for full path
- `size`: u64 field for size
- `modified`: DateTime field for modification time
- `is_folder`: Boolean field

**Query Support**:
- Exact name/path matches
- Partial matches with wildcards
- Regex patterns
- Fuzzy search for typos

## Relationships

- FileEntity instances are stored in sled database for metadata
- Tantivy index references FileEntity by id for full-text search capabilities
- No complex relationships; primarily entity-centric storage

## State Transitions

- **Created**: When file/folder is discovered during indexing
- **Updated**: When file metadata changes (size, modified time)
- **Deleted**: When file/folder is removed from file system

## Data Flow

1. File system traversal discovers files/folders
2. Metadata stored in sled
3. Tantivy index updated with searchable fields
4. Search queries executed against tantivy index
5. Results enriched with full metadata from sled