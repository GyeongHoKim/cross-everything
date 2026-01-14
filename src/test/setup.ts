import "@testing-library/jest-dom";
import { mockIPC } from "@tauri-apps/api/mocks";

// Setup mockIPC globally for all tests with event mocking enabled
mockIPC(() => {}, { shouldMockEvents: true });
