# Task Completion Checklist

Before marking a task as done:
1. **Frontend**: Run `npm run check` (Biome) and `npm run typecheck` (TSC) to ensure code quality. Also run `npm run test` for unit tests.
2. **Backend**: If Rust code changed, run `cd src-tauri; cargo check` and `cargo test`.
3. **Verification**: Verify the feature works as expected.
4. **Cleanup**: Remove temporary logging.
