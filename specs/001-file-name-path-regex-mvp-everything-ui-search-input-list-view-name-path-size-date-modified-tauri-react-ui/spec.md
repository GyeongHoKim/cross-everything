# Feature Specification: File and Folder Search

**Feature Branch**: `001-file-name-path-regex-mvp-everything-ui-search-input-list-view-name-path-size-date-modified-tauri-react-ui`  
**Created**: 2026-01-12  
**Status**: Draft  
**Input**: User description: "사용자는 file name 혹은 path로 자신이 원하는 파일 혹은 path를 찾을 수 있어야 한다. regex를 허용한다. MVP를 위해, everything의 UI 중 search input과 list view(Name, Path, Size, Date Modified)에만 집중한다. Tauri 백엔드와 React UI 모두 작업하여 완전한 기능으로써 동작해야 한다."

## User Scenarios & Testing

### User Story 1 - Search Files and Folders by Name or Path (Priority: P1)

As a user, I want to enter a search query in the search input field to find files and folders that match by name or path, with support for regular expressions.

**Why this priority**: This is the core functionality of the file search feature, enabling users to quickly locate their desired files and folders.

**Independent Test**: Can be fully tested by entering search terms and verifying that matching results appear in the list view, delivering immediate value for file discovery.

**Acceptance Scenarios**:

1. **Given** the application is open, **When** I enter a file name "example.txt" in the search input, **Then** the list view displays files named "example.txt" with their Name, Path, Size, and Date Modified.
2. **Given** the search input supports regex, **When** I enter a regex pattern like ".*\.jpg$", **Then** the list view shows only files with .jpg extension.
3. **Given** I search by path, **When** I enter a partial path like "Documents/project", **Then** the list view filters to files and folders within that path.

---

### Edge Cases

- What happens when no files match the search query? The list view should be empty.
- How does the system handle invalid regex patterns? Display an error message and treat it as literal search.
- What if the search query matches thousands of files? Limit results to a reasonable number (e.g., 1000) and indicate if more exist.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a search input field that accepts text queries for file and folder names or paths.
- **FR-002**: System MUST support regular expression syntax in search queries.
- **FR-003**: System MUST display search results in a list view showing Name, Path, Size, and Date Modified columns.
- **FR-004**: System MUST search through the file system and return matching files and folders in real-time or near real-time.
- **FR-005**: System MUST integrate Tauri backend for file system operations with React frontend for UI.

### Key Entities

- **File**: Represents a file on the system with attributes name, full path, size in bytes, and last modified date.
- **Folder**: Represents a directory with name, full path, and last modified date (size may not apply or be 0).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can find specific files by name in under 2 seconds for typical search queries.
- **SC-002**: Regex searches return accurate results matching the pattern in 95% of cases.
- **SC-003**: The list view displays up to 1000 results without performance degradation.
- **SC-004**: 90% of users can successfully locate their desired files using the search functionality on first attempt.
