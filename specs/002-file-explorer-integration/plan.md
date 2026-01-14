# Implementation Plan: File Explorer Integration

**Branch**: `002-file-explorer-integration` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-file-explorer-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enables users to interact with search results by double-clicking to open files/directories in their default applications or file explorers, and right-clicking to access native OS context menus. Implementation will use Tauri v2's opener plugin for file/directory opening, and platform-specific Rust code for native context menu invocation. The implementation follows TDD principles with unit tests for both React frontend and Rust backend.

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 5.8.3, React 19.1.0
- Backend: Rust 1.70 (edition 2021)
- Tauri: v2.9.5

**Primary Dependencies**: 
- Frontend: `@tauri-apps/api` v2, `@tauri-apps/plugin-opener` v2.5.3, React 19.1.0
- Backend: `tauri` v2, `tauri-plugin-opener` v2, `serde`, `serde_json`
- Testing: Vitest 4.0.16 (frontend), `cargo test` with `tempfile`, `tokio` (backend)

**Storage**: N/A (feature uses file system operations only)

**Testing**: 
- Frontend: Vitest with `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Backend: `cargo test` with `tempfile` for temporary file system operations, `tokio` for async testing
- TDD approach: Write unit tests first, then implement to pass tests

**Target Platform**: 
- Windows 10+
- macOS (Intel & Apple Silicon)
- Linux (various distributions)

**Project Type**: Web application (Tauri desktop app with React frontend + Rust backend)

**Performance Goals**: 
- Double-click to open: <500ms perceived latency (SC-003)
- Right-click context menu: <300ms perceived latency (SC-004)
- Error feedback: <1 second (SC-005)

**Constraints**: 
- Must handle files/directories that no longer exist gracefully
- Must handle OS errors (permissions, missing default apps) with user-friendly dialogs
- Must work across Windows, macOS, and Linux
- All unit tests must pass
- No lint errors (Biome for frontend, clippy for backend)

**Scale/Scope**: 
- Single feature addition to existing Tauri application
- Affects `FileList` component and adds new Tauri commands
- Estimated: 2-3 React components/hooks, 2-3 Rust commands, ~10-15 unit tests total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Code Quality Assurance: Automated quality gates configured (`npm run check`, `npm run typecheck`, `npm run format:core`, `npm run lint:core`) - will run post-modification
- [x] Comprehensive Testing Standards: TDD approach with unit tests for both frontend (Vitest) and backend (cargo test). All critical paths (file open, directory open, context menu) will have unit tests
- [x] User Experience Excellence: Performance goals defined (SC-003: <500ms, SC-004: <300ms, SC-005: <1s). Error handling with persistent dialogs per FR-007 and FR-008
- [x] UI Style Consistency: Existing design patterns in `FileList` component will be maintained. New interactions (double-click, right-click) follow OS conventions

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── components/
│   ├── FileList.tsx          # Modify: Add double-click and right-click handlers
│   └── FileList.test.tsx     # Modify: Add tests for new interactions
├── hooks/
│   └── useFileExplorer.ts    # New: Hook for file/directory operations
└── types/
    └── search.ts             # Existing: FileResult type used

src-tauri/
├── src/
│   ├── lib.rs               # Modify: Add new Tauri commands
│   └── explorer.rs           # New: Platform-specific file explorer operations
└── tests/
    └── explorer_test.rs      # New: Unit tests for explorer commands
```

**Structure Decision**: This is a Tauri web application with React frontend and Rust backend. The feature extends existing `FileList` component with new event handlers and adds new Rust commands for file system operations. Platform-specific code for context menus will be in `explorer.rs` using conditional compilation (`#[cfg(target_os = "...")]`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
