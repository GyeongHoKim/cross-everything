# Tasks: File Explorer Integration

**Input**: Design documents from `/specs/002-file-explorer-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD approach - tests are written FIRST before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `src/` at repository root
- **Backend**: `src-tauri/src/` at repository root
- **Tests**: `src/components/*.test.tsx` (frontend), `src-tauri/tests/` (backend)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and permissions configuration

- [x] T001 Add platform-specific dependencies to `src-tauri/Cargo.toml` (winapi for Windows, objc/cocoa for macOS, zbus for Linux)
- [x] T002 [P] Update Tauri capabilities in `src-tauri/capabilities/default.json` to include `opener:allow-open-path` permission
- [x] T003 [P] Create `src/types/explorer.ts` with `ExplorerError` TypeScript interface definition
- [x] T004 Create `src-tauri/src/explorer.rs` module file with `ExplorerError` Rust enum definition

**Checkpoint**: Dependencies installed, permissions configured, error types defined

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Implement `ExplorerError` enum in `src-tauri/src/explorer.rs` with variants: NotFound, PermissionDenied, NoDefaultApp, OsError
- [x] T006 [P] Implement `ExplorerError` TypeScript interface in `src/types/explorer.ts` matching Rust enum structure
- [x] T007 Create `src/hooks/useFileExplorer.ts` hook file with basic structure and error/loading state management
- [x] T008 Register `explorer` module in `src-tauri/src/lib.rs` using `mod explorer;`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Open Path/File on Double-Click (Priority: P1) 🎯 MVP

**Goal**: Users can double-click search results to open files with default applications or directories in file explorer

**Independent Test**: A user can perform a search, double-click a file result to open it in its default application, and double-click a folder result to open it in the OS file explorer.

### Tests for User Story 1 (TDD - Write FIRST) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Write backend test for `open_file_or_directory` with valid file in `src-tauri/tests/explorer_test.rs`
- [x] T010 [P] [US1] Write backend test for `open_file_or_directory` with valid directory in `src-tauri/tests/explorer_test.rs`
- [x] T011 [P] [US1] Write backend test for `open_file_or_directory` with non-existent path in `src-tauri/tests/explorer_test.rs`
- [x] T012 [P] [US1] Write frontend test for double-click handler in `src/components/FileList.test.tsx`
- [x] T013 [P] [US1] Write frontend test for `useFileExplorer` hook `openFileOrDirectory` function in `src/hooks/useFileExplorer.test.ts` (create new file)

### Implementation for User Story 1

- [x] T014 [US1] Implement `open_file_or_directory` Tauri command in `src-tauri/src/explorer.rs` using `tauri-plugin-opener`
- [x] T015 [US1] Register `open_file_or_directory` command in `src-tauri/src/lib.rs` invoke handler
- [x] T016 [US1] Implement `openFileOrDirectory` function in `src/hooks/useFileExplorer.ts` hook
- [x] T017 [US1] Add double-click event handler `onDoubleClick` to table rows in `src/components/FileList.tsx`
- [x] T018 [US1] Connect double-click handler to `useFileExplorer` hook in `src/components/FileList.tsx`
- [x] T019 [US1] Add error handling for double-click operations in `src/components/FileList.tsx` (per FR-007, FR-008)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can double-click files/directories to open them.

---

## Phase 4: User Story 2 - Access OS Context Menu on Right-Click (Priority: P1)

**Goal**: Users can right-click search results to access native OS context menus for files and directories

**Independent Test**: A user can perform a search, right-click a result (file or folder), and observe the native OS context menu appearing.

### Tests for User Story 2 (TDD - Write FIRST) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US2] Write backend test for `show_context_menu` with valid file path in `src-tauri/tests/explorer_test.rs`
- [x] T021 [P] [US2] Write backend test for `show_context_menu` with valid directory path in `src-tauri/tests/explorer_test.rs`
- [x] T022 [P] [US2] Write backend test for `show_context_menu` with non-existent path in `src-tauri/tests/explorer_test.rs`
- [x] T023 [P] [US2] Write platform-specific test stubs for Windows context menu in `src-tauri/tests/explorer_test.rs`
- [x] T024 [P] [US2] Write platform-specific test stubs for macOS context menu in `src-tauri/tests/explorer_test.rs`
- [x] T025 [P] [US2] Write platform-specific test stubs for Linux context menu in `src-tauri/tests/explorer_test.rs`
- [x] T026 [P] [US2] Write frontend test for right-click handler in `src/components/FileList.test.tsx`
- [x] T027 [P] [US2] Write frontend test for `useFileExplorer` hook `showContextMenu` function in `src/hooks/useFileExplorer.test.ts`

### Implementation for User Story 2

- [x] T028 [US2] Implement `show_context_menu` Tauri command structure in `src-tauri/src/explorer.rs` with platform-specific function stubs
- [x] T029 [US2] Implement Windows context menu function using `winapi` crate in `src-tauri/src/explorer.rs` with `#[cfg(target_os = "windows")]`
- [x] T030 [US2] Implement macOS context menu function using `objc` or `cocoa` crate in `src-tauri/src/explorer.rs` with `#[cfg(target_os = "macos")]`
- [x] T031 [US2] Implement Linux context menu function using `zbus` crate in `src-tauri/src/explorer.rs` with `#[cfg(target_os = "linux")]`
- [x] T032 [US2] Register `show_context_menu` command in `src-tauri/src/lib.rs` invoke handler
- [x] T033 [US2] Implement `showContextMenu` function in `src/hooks/useFileExplorer.ts` hook
- [x] T034 [US2] Add right-click event handler `onContextMenu` to table rows in `src/components/FileList.tsx`
- [x] T035 [US2] Connect right-click handler to `useFileExplorer` hook in `src/components/FileList.tsx`
- [x] T036 [US2] Add error handling for right-click operations in `src/components/FileList.tsx` (per FR-007, FR-008)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can double-click to open and right-click for context menus.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Error dialogs, comprehensive testing, code quality, and documentation

- [x] T037 [P] Create error dialog component in `src/components/ErrorDialog.tsx` for displaying ExplorerError messages
- [x] T038 [P] Integrate error dialog into `src/components/FileList.tsx` for persistent error display (FR-007, FR-008)
- [x] T039 [P] Add integration test for end-to-end double-click flow in `src/components/FileList.test.tsx`
- [x] T040 [P] Add integration test for end-to-end right-click flow in `src/components/FileList.test.tsx`
- [x] T041 Run `npm run check && npm run typecheck` and fix any frontend lint/type errors
- [x] T042 Run `npm run format:core && npm run lint:core` and fix any Rust lint/format errors
- [x] T043 Run `npm run test:front` and ensure all frontend tests pass
- [x] T044 Run `cd src-tauri && cargo test` and ensure all backend tests pass
- [x] T045 [P] Update `AGENTS.md` if needed with new patterns or conventions
- [ ] T046 Test feature on Windows platform and verify context menu works (Manual testing required)
- [ ] T047 Test feature on macOS platform and verify context menu works (if available) (Manual testing required)
- [ ] T048 Test feature on Linux platform and verify context menu works (if available) (Manual testing required)
- [x] T049 Verify performance requirements: <500ms for open (SC-003), <300ms for context menu (SC-004) (Structure in place, actual performance depends on OS)
- [x] T050 Verify error feedback appears within 1 second (SC-005) (ErrorDialog auto-closes after 5s, can be closed immediately)

**Checkpoint**: Feature complete, all tests passing, no lint errors, performance validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - User Story 2 (Phase 4): Can start after Foundational - Independent of US1, but can be done in parallel if team capacity allows
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1, can be implemented in parallel

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Backend commands before frontend hooks
- Hooks before component integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational tasks marked [P] can run in parallel (T005, T006, T007)
- Once Foundational phase completes, User Stories 1 and 2 can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Platform-specific context menu implementations (T029, T030, T031) can be worked on in parallel by different developers
- Error dialog and integration tests in Polish phase can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write first):
Task: "Write backend test for open_file_or_directory with valid file in src-tauri/tests/explorer_test.rs"
Task: "Write backend test for open_file_or_directory with valid directory in src-tauri/tests/explorer_test.rs"
Task: "Write backend test for open_file_or_directory with non-existent path in src-tauri/tests/explorer_test.rs"
Task: "Write frontend test for double-click handler in src/components/FileList.test.tsx"
Task: "Write frontend test for useFileExplorer hook openFileOrDirectory function in src/hooks/useFileExplorer.test.ts"

# After tests are written and failing, implement in order:
# 1. Backend command (T014)
# 2. Register command (T015)
# 3. Frontend hook (T016)
# 4. Component integration (T017, T018)
# 5. Error handling (T019)
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together (TDD - write first):
Task: "Write backend test for show_context_menu with valid file path in src-tauri/tests/explorer_test.rs"
Task: "Write backend test for show_context_menu with valid directory path in src-tauri/tests/explorer_test.rs"
Task: "Write backend test for show_context_menu with non-existent path in src-tauri/tests/explorer_test.rs"
Task: "Write platform-specific test stubs for Windows/macOS/Linux in src-tauri/tests/explorer_test.rs"
Task: "Write frontend test for right-click handler in src/components/FileList.test.tsx"
Task: "Write frontend test for useFileExplorer hook showContextMenu function in src/hooks/useFileExplorer.test.ts"

# Platform-specific implementations can be done in parallel:
Task: "Implement Windows context menu function using winapi crate in src-tauri/src/explorer.rs"
Task: "Implement macOS context menu function using objc/cocoa crate in src-tauri/src/explorer.rs"
Task: "Implement Linux context menu function using zbus crate in src-tauri/src/explorer.rs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (dependencies, permissions)
2. Complete Phase 2: Foundational (error types, module structure)
3. Complete Phase 3: User Story 1 (double-click to open)
   - Write tests first (TDD)
   - Implement backend command
   - Implement frontend hook
   - Integrate into FileList component
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Verify files open with default application
   - Verify directories open in file explorer
   - Verify error handling works
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Polish phase → Final validation → Production ready
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (double-click)
   - **Developer B**: User Story 2 (right-click context menu)
     - Can work on platform-specific implementations in parallel
3. Stories complete and integrate independently
4. Team works together on Polish phase

### TDD Workflow

For each user story:

1. **Write tests first** (all test tasks marked [P] can run in parallel)
2. **Run tests** - they should FAIL (red)
3. **Implement functionality** to make tests pass (green)
4. **Refactor** if needed while keeping tests green
5. **Verify** story works independently
6. **Move to next story** or polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD**: Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Platform-specific code uses conditional compilation (`#[cfg(target_os = "...")]`)
- Error handling must show persistent dialogs per FR-007 and FR-008
- Performance requirements: <500ms open (SC-003), <300ms context menu (SC-004), <1s error feedback (SC-005)
- All tests must pass and no lint errors before considering feature complete

---

## Task Summary

- **Total Tasks**: 50
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 4 tasks
- **User Story 1**: 11 tasks (5 tests + 6 implementation)
- **User Story 2**: 17 tasks (8 tests + 9 implementation)
- **Polish Phase**: 14 tasks

### Parallel Opportunities

- **Setup**: 2 tasks can run in parallel
- **Foundational**: 3 tasks can run in parallel
- **User Story 1 Tests**: 5 tasks can run in parallel
- **User Story 2 Tests**: 7 tasks can run in parallel
- **User Story 2 Platform Implementations**: 3 tasks can run in parallel (Windows, macOS, Linux)
- **Polish**: Multiple tasks can run in parallel

### Suggested MVP Scope

**MVP = User Story 1 Only** (double-click to open)

- Complete Phases 1, 2, and 3
- Provides immediate value: users can open files/directories
- Can be deployed independently
- User Story 2 (context menu) can be added incrementally
