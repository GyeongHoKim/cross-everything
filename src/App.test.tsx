import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

// Mock Tauri invoke function since it's not available in test environment
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  it("renders welcome message", () => {
    render(<App />);
    expect(screen.getByText("Welcome to Tauri + React")).toBeInTheDocument();
  });
});
