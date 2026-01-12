# Tasks: File and Folder Search

**Input**: Design documents from `/specs/001-file-name-path-regex-mvp-everything-ui-search-input-list-view-name-path-size-date-modified-tauri-react-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in the feature specification, so test tasks are excluded from this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Tauri project**: `src-tauri/src/` for Rust backend, `src/` for React frontend
- Paths shown below follow the Tauri project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create Rust module structure in src-tauri/src/ (search.rs, index.rs, watcher.rs)
- [x] T002 Add dependencies to src-tauri/Cargo.toml (tantivy, sled, notify, walkdir)
- [x] T003 [P] Create React component directory structure in src/components/
- [x] T004 [P] Create React hooks directory structure in src/hooks/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create FileEntity struct in src-tauri/src/lib.rs with fields: id, name, path, size, modified, is_folder
- [x] T006 [P] Initialize sled database connection in src-tauri/src/index.rs
- [x] T007 [P] Initialize tantivy search index schema in src-tauri/src/search.rs (name, path, size, modified, is_folder fields)
- [x] T008 Implement index storage functions in src-tauri/src/index.rs (save FileEntity to sled)
- [x] T009 Implement index search functions in src-tauri/src/search.rs (query tantivy index)
- [x] T010 Setup Tauri command structure in src-tauri/src/lib.rs (register command handlers)
- [x] T011 Create TypeScript types for search API in src/types/search.ts (matching contracts/search-api.md)
- [x] T012 Configure Tauri permissions for file system access in src-tauri/capabilities/default.json

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Search Files and Folders by Name or Path (Priority: P1) 🎯 MVP

**Goal**: Users can enter a search query in the search input field to find files and folders that match by name or path, with support for regular expressions. Results are displayed in a list view showing Name, Path, Size, and Date Modified.

**Independent Test**: Can be fully tested by entering search terms and verifying that matching results appear in the list view, delivering immediate value for file discovery.

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement build_index Tauri command in src-tauri/src/lib.rs (calls index.rs functions)
- [x] T014 [P] [US1] Implement file system traversal with walkdir in src-tauri/src/index.rs (recursive directory walk)
- [x] T015 [US1] Implement index building logic in src-tauri/src/index.rs (store FileEntity in sled, update tantivy index)
- [x] T016 [US1] Implement search_files Tauri command in src-tauri/src/lib.rs (calls search.rs functions)
- [x] T017 [US1] Implement regex query parsing in src-tauri/src/search.rs (validate and execute regex patterns)
- [x] T018 [US1] Implement search result formatting in src-tauri/src/search.rs (return results with name, path, size, modified, is_folder)
- [x] T019 [US1] Implement result limiting in src-tauri/src/search.rs (max 1000 results)
- [x] T020 [P] [US1] Create SearchInput component in src/components/SearchInput.tsx (input field with regex toggle)
- [x] T021 [P] [US1] Create FileList component in src/components/FileList.tsx (list view with Name, Path, Size, Date Modified columns)
- [x] T022 [US1] Create useFileSearch hook in src/hooks/useFileSearch.ts (calls search_files Tauri command)
- [x] T023 [US1] Integrate SearchInput and FileList in src/App.tsx (connect hook to components)
- [x] T024 [US1] Add error handling for invalid regex patterns in src-tauri/src/search.rs (return INVALID_REGEX error)
- [x] T025 [US1] Add error handling for index not ready in src-tauri/src/search.rs (return INDEX_NOT_READY error)
- [x] T026 [US1] Implement get_index_status Tauri command in src-tauri/src/lib.rs (return index readiness status)
- [x] T027 [US1] Add loading state handling in src/hooks/useFileSearch.ts (show loading during search)
- [x] T028 [US1] Add empty state handling in src/components/FileList.tsx (display message when no results)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can search for files by name or path with regex support and see results in the list view.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T029 [P] Add file system watching with notify in src-tauri/src/watcher.rs (real-time index updates)
- [x] T030 [P] Integrate file watcher with index in src-tauri/src/index.rs (update index on file changes)
- [x] T031 [P] Add progress events for index building in src-tauri/src/lib.rs (emit index-progress events)
- [x] T032 [P] Add search performance optimization in src-tauri/src/search.rs (optimize tantivy queries)
- [x] T033 [P] Add UI styling improvements in src/components/SearchInput.tsx and src/components/FileList.tsx
- [x] T034 [P] Add accessibility features (keyboard navigation, ARIA labels) in src/components/
- [x] T035 [P] Add error message display in src/components/SearchInput.tsx (show regex errors)
- [x] T036 [P] Add index status indicator in src/components/SearchInput.tsx (show if index is ready)
- [x] T037 Run quickstart.md validation (verify all steps work correctly)
- [x] T038 Code cleanup and refactoring across all files
- [x] T039 Documentation updates (add code comments, update README if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on User Story 1 completion (can start some tasks in parallel with US1)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within User Story 1

- Index building (T013-T015) before search (T016-T019)
- Backend commands (T013, T016, T026) before frontend integration (T020-T023)
- Core search functionality before error handling (T024-T025)
- Components (T020-T021) before integration (T023)
- Hook (T022) before integration (T023)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004)
- Foundational tasks marked [P] can run in parallel (T006, T007, T011)
- Within User Story 1:
  - T013 and T020-T021 can run in parallel (different files)
  - T020 and T021 can run in parallel (different components)
  - T024-T025 can run in parallel (different error types)
- Polish tasks marked [P] can run in parallel with each other and some can start during US1

---

## Parallel Example: User Story 1

```bash
# Launch backend index building and frontend components in parallel:
Task: "Implement build_index Tauri command in src-tauri/src/lib.rs"
Task: "Create SearchInput component in src/components/SearchInput.tsx"
Task: "Create FileList component in src/components/FileList.tsx"

# Launch error handling tasks in parallel:
Task: "Add error handling for invalid regex patterns in src-tauri/src/search.rs"
Task: "Add error handling for index not ready in src-tauri/src/search.rs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Enter search query "example.txt" → verify results appear
   - Enter regex ".*\.jpg$" → verify only .jpg files shown
   - Enter path "Documents/project" → verify path filtering works
   - Verify list view shows Name, Path, Size, Date Modified
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add Polish features → Enhance UX → Deploy/Demo
4. Each increment adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: Backend search implementation (T016-T019, T024-T025)
   - Developer B: Frontend components (T020-T021)
   - Developer C: Integration and hook (T022-T023, T026-T028)
3. Components integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 1 should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All file paths are absolute or relative to repository root as specified in plan.md
- Backend Rust code follows snake_case, frontend TypeScript follows camelCase/PascalCase per project conventions
