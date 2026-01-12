# API Contracts

## Tauri Commands

### search_files

Search for files and folders matching the query.

**Input**:
```typescript
{
  query: string,        // Search query (name or path)
  use_regex: boolean,   // Whether to treat query as regex
  limit: number         // Maximum number of results (default 1000)
}
```

**Output**:
```typescript
{
  results: Array<{
    name: string,
    path: string,
    size: number,
    modified: string,  // ISO 8601 date string
    is_folder: boolean
  }>,
  total_found: number,  // Total matches (may be > results.length)
  search_time_ms: number
}
```

**Errors**:
- "INVALID_REGEX": If regex is malformed
- "INDEX_NOT_READY": If indexing is in progress

### build_index

Build or rebuild the search index for specified paths.

**Input**:
```typescript
{
  paths: string[],      // Array of absolute paths to index
  force_rebuild: boolean // Whether to rebuild from scratch
}
```

**Output**:
```typescript
{
  status: "started" | "completed" | "failed",
  files_indexed: number,
  errors: string[]
}
```

**Events Emitted**:
- `index-progress`: { processed: number, total: number }

### get_index_status

Get current status of the search index.

**Input**: (none)

**Output**:
```typescript
{
  is_ready: boolean,
  total_files: number,
  last_updated: string | null,  // ISO 8601 or null if never
  indexing_in_progress: boolean
}
```

## Frontend Hooks

### useFileSearch

React hook for file search functionality.

```typescript
const { search, results, loading, error } = useFileSearch();

const handleSearch = (query: string, useRegex: boolean) => {
  search({ query, useRegex });
};
```