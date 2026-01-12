# Research Findings: Fast File Search Implementation

## Overview

To implement fast file search similar to Everything on Windows, we need to create an indexed search system for macOS and Linux. Everything uses NTFS change journal for real-time updates; we'll use file system watching and indexing.

## Key Decisions

### Search Engine: Tantivy

**Decision**: Use tantivy as the core search engine.

**Rationale**: Tantivy is a full-text search library in Rust that provides fast indexing and querying. It supports regex queries, fuzzy search, and can handle large datasets efficiently. It's designed for embedding in applications and provides the speed needed for instant search results.

**Alternatives Considered**:
- Subprocess calls to 'find' or 'locate': Too slow for real-time search, limited regex support, no indexing.
- Recoll or Tracker as subprocess: Heavy dependencies, designed for desktop search with metadata, overkill for file name/path search.
- Custom regex matching on directory traversal: Would be slow for large file systems, no persistence.

### Index Storage: Sled

**Decision**: Use sled for storing index metadata and file information.

**Rationale**: Sled is a fast embedded database that stores data on disk, allowing the index to persist across application restarts. It's file-based, transactional, and optimized for performance in Rust applications.

**Alternatives Considered**:
- SQLite: More complex setup, additional dependency, sled is more suitable for embedded use.
- In-memory only: Would require re-indexing on every start, slow for large file systems.
- Flat files: Manual serialization would be error-prone and slower.

### Real-time Updates: Notify

**Decision**: Use notify for file system change monitoring.

**Rationale**: Notify provides cross-platform file system watching using FSEvents on macOS and inotify on Linux. This enables near real-time updates to the index when files are added, modified, or deleted, similar to Everything's NTFS journal approach.

**Alternatives Considered**:
- Periodic full scans: Would miss changes between scans, not real-time.
- Manual polling: Inefficient and resource-intensive.

### File Traversal: Walkdir

**Decision**: Use walkdir for initial index building and updates.

**Rationale**: Walkdir is an efficient, cross-platform library for recursive directory traversal in Rust. It's faster than standard library approaches and provides good error handling.

**Alternatives Considered**:
- Standard fs::read_dir: Slower and less feature-rich.
- Subprocess 'find': External dependency, harder to integrate.

## Performance Strategy

To achieve fast performance on macOS/Linux:

1. **Initial Indexing**: Use walkdir to traverse file system in background, building tantivy index with sled storage.
2. **Incremental Updates**: Use notify to watch for changes and update index incrementally.
3. **Search Queries**: Query tantivy index for instant results, limit to 1000 results to prevent UI overload.
4. **Lazy Loading**: For very large indexes, implement pagination or streaming results.
5. **Optimization**: Use tantivy 's advanced features like term dictionary and posting lists for fast queries.

## Implementation Notes

- Index will store: file name, full path, size, modification date
- Search will support exact matches, partial matches, and regex patterns
- UI will display results in list view with sorting options
- Background indexing to avoid blocking UI

This approach provides a balance of speed, real-time updates, and cross-platform compatibility.