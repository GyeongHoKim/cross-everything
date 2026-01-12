<!--
Sync Impact Report
Version change: N/A → 1.0.0
List of modified principles: N/A (new constitution)
Added sections: Technical Standards, Development Workflow
Removed sections: N/A
Templates requiring updates: ⚠ pending - plan-template.md Constitution Check section
Follow-up TODOs: N/A
-->
# CrossEverything Constitution

## Core Principles

### I. Code Quality Assurance
All code modifications MUST pass automated quality gates: formatting (`npm run format`), linting (`npm run lint`), and type checking (`npm run typecheck`). Agents are required to execute these gates immediately after any code changes to prevent regressions and maintain consistent code standards.

### II. Comprehensive Testing Standards
Every feature implementation MUST include appropriate testing: unit tests for components/logic, integration tests for API interactions, and end-to-end tests for user workflows. Test coverage MUST exceed 80% for critical paths, with automated test execution in CI/CD pipelines.

### III. User Experience Excellence
All user-facing features MUST prioritize intuitive design and responsive performance. User experience decisions SHOULD guide technical implementations, with usability testing required for major features to ensure accessibility and efficiency.

### IV. UI Style Consistency
The application MUST maintain consistent visual design language across all interfaces. UI components SHOULD follow established design tokens and patterns, with design system documentation updated alongside code changes.

## Technical Standards

Technology stack includes React/TypeScript frontend with Tauri Rust backend. Code formatting uses Biome, testing with Vitest, and Git hooks enforce pre-commit quality checks. All contributions MUST use the established tooling and follow the documented patterns in AGENTS.md.

## Development Workflow

Agents MUST execute code quality gates after modifications. Pull requests REQUIRE successful CI checks including all test suites and linting. Code reviews MUST verify principle compliance, with automated checks preventing merges of non-compliant code.

## Governance

These principles supersede all other practices and MUST guide all technical decisions. Implementation choices SHOULD be justified by reference to relevant principles, with complexity requiring explicit rationale. Agents are accountable for maintaining code quality through automated gates and proactive compliance checks. Amendments require consensus approval and updated documentation.

**Version**: 1.0.0 | **Ratified**: 2026-01-12 | **Last Amended**: 2026-01-12
