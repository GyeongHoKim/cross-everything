# Agent Guide for CrossEverything

This repository contains a **Tauri v2** application using **React**, **TypeScript**, and **Vite**.

## 🚀 Quick Start

- **Dev Server**: `npm run tauri dev` (Starts frontend + Rust backend)
- **Frontend Only**: `npm run dev`
- **Build**: `npm run tauri build`
- **Type Check**: `npm run typecheck`
- **Format**: `npm run format`
- **Lint**: `npm run lint`

## 🛠 Project Structure

- `src/` - Frontend (React + TypeScript)
- `src-tauri/` - Backend (Rust)
- `package.json` - Node dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## 🧪 Testing & Verification

### Frontend (React/TS)
- **Validation**: `npm run check` (Runs Biome check: formatting + linting)
- **Type Check**: `npm run typecheck` (Runs `tsc --noEmit`)
- **Unit Tests**: `npm run test` (Runs Vitest)
  - Run single test: `npm run test -- -t "test name"`
  - UI Mode: `npm run test -- --ui`

### Backend (Rust)
- **Run Tests**: `cd src-tauri && cargo test`
- **Check**: `cd src-tauri && cargo check`

## 🎨 Code Style Guidelines

### TypeScript / React
- **Formatting**:
  - Indentation: **2 spaces**
  - Quotes: **Double quotes** (`"`)
  - Semicolons: **Always**
- **Naming**:
  - Components: `PascalCase` (e.g., `App.tsx`)
  - Functions/Variables: `camelCase`
  - Interfaces: `PascalCase`
- **Components**:
  - Use Functional Components with Hooks.
  - Export components as `default` (e.g., `export default App;`).
- **Imports**:
  - Use explicit imports.
  - Imports from `@tauri-apps/api/*` for backend communication.

### Rust (src-tauri)
- Follow standard Rust formatting (`cargo fmt`).
- Use `snake_case` for functions and modules.
- Use `PascalCase` for structs and enums.

## 🔗 Tauri Integration rules

1. **Invoking Commands**:
   Use `invoke` from `@tauri-apps/api/core` to call Rust commands.
   ```typescript
   import { invoke } from "@tauri-apps/api/core";
   // ...
   await invoke("command_name", { arg: value });
   ```

2. **Rust Commands**:
   Defined in `src-tauri/src/lib.rs` (or `main.rs`) and annotated with `#[tauri::command]`.

## 🤖 Agent Behavior Rules

1. **Verify Types**: ALWAYS run `npm run format && npm run lint && npm run typecheck` after making changes to TypeScript files. Do not assume validity.
2. **Dependency Management**:
   - Frontend: `npm install <package>`
   - Backend: Add to `src-tauri/Cargo.toml`
3. **Refactoring**:
   - If modifying a Rust command signature, update the corresponding frontend `invoke` call immediately.
   - Keep `App.tsx` clean; move complex logic to custom hooks or utility files if it grows.
4. **Error Handling**:
   - Handle async `invoke` errors.
   - Use `try/catch` block for Tauri API calls.

## 📝 Commit Conventions

- Use conventional commits if possible (e.g., `feat:`, `fix:`, `chore:`).
- Keep changes atomic.

