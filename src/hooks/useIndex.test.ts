import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildIndexOutput, GetIndexStatusOutput } from "../types/search";
import { useIndex } from "./useIndex";

const { mockInvoke, mockListen } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockListen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

describe("useIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for listen - returns a function that can be called to unlisten
    mockListen.mockResolvedValue(vi.fn());
  });

  it("should check initial index status on mount", async () => {
    const mockStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };
    mockInvoke.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_index_status");
    expect(result.current.totalFiles).toBe(1000);
    expect(result.current.lastUpdated).toBe("2024-01-01T00:00:00Z");
  });

  it("should build index successfully", async () => {
    // First call: get_index_status on mount
    mockInvoke.mockResolvedValueOnce({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: false,
    });
    // Second call: build_index
    const mockBuildResult: BuildIndexOutput = {
      status: "completed",
      files_indexed: 100,
      errors: [],
    };
    mockInvoke.mockResolvedValueOnce(mockBuildResult);
    // Third call: get_index_status after build
    mockInvoke.mockResolvedValueOnce({
      is_ready: true,
      total_files: 100,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    await act(async () => {
      await result.current.buildIndex(["/home"], false);
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
      expect(result.current.totalFiles).toBe(100);
    });
  });

  it("should handle index progress events", async () => {
    mockInvoke.mockResolvedValue({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: true,
    });

    let eventHandler: ((event: { payload: { processed: number; total: number } }) => void) | null =
      null;
    mockListen.mockImplementation((_event, handler) => {
      eventHandler = handler as never;
      return Promise.resolve(vi.fn());
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("index-progress", expect.any(Function));
    });

    expect(eventHandler).not.toBeNull();

    act(() => {
      eventHandler?.({ payload: { processed: 50, total: 100 } });
    });

    await waitFor(() => {
      expect(result.current.indexProgress).toEqual({
        processed: 50,
        total: 100,
        percentage: 50,
      });
    });
  });

  it("should handle index build errors", async () => {
    mockInvoke.mockRejectedValue(new Error("Index build failed"));

    const { result } = renderHook(() => useIndex());

    await act(async () => {
      try {
        await result.current.buildIndex(["/home"], false);
      } catch (e) {
        expect(String(e)).toBe("Index build failed");
      }
    });
  });

  it("should force rebuild index", async () => {
    // First call: get_index_status on mount
    mockInvoke.mockResolvedValueOnce({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: true,
    });
    // Second call: build_index
    mockInvoke.mockResolvedValueOnce({
      status: "completed",
      files_indexed: 0,
      errors: [],
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    await act(async () => {
      await result.current.buildIndex(["/home"], true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("build_index", {
      paths: ["/home"],
      forceRebuild: true,
    });
  });

  it("should handle get_index_status errors gracefully", async () => {
    mockInvoke.mockRejectedValue(new Error("Failed to get status"));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get index status:",
        expect.any(Error),
      );
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.totalFiles).toBe(0);
    expect(result.current.lastUpdated).toBe(null);

    consoleErrorSpy.mockRestore();
  });

  it("should clear progress when build completes", async () => {
    // First call: get_index_status on mount
    mockInvoke.mockResolvedValueOnce({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: true,
    });
    // Second call: build_index
    mockInvoke.mockResolvedValueOnce({
      status: "completed",
      files_indexed: 100,
      errors: [],
    });
    // Third call: get_index_status after build
    mockInvoke.mockResolvedValueOnce({
      is_ready: true,
      total_files: 100,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    });

    let eventHandler: ((event: { payload: { processed: number; total: number } }) => void) | null =
      null;
    mockListen.mockImplementation((_event, handler) => {
      eventHandler = handler as never;
      return Promise.resolve(vi.fn());
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    // Simulate progress event
    act(() => {
      eventHandler?.({ payload: { processed: 50, total: 100 } });
    });

    await waitFor(() => {
      expect(result.current.indexProgress).not.toBeNull();
    });

    // Build index
    await act(async () => {
      await result.current.buildIndex(["/home"], false);
    });

    // Progress should be cleared after build completes
    await waitFor(() => {
      expect(result.current.indexProgress).toBeNull();
    });
  });

  it("should clear progress on build error", async () => {
    // First call: get_index_status on mount
    mockInvoke.mockResolvedValueOnce({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: false,
    });
    // Second call: build_index (will fail)
    mockInvoke.mockRejectedValueOnce(new Error("Build failed"));

    let eventHandler: ((event: { payload: { processed: number; total: number } }) => void) | null =
      null;
    mockListen.mockImplementation((_event, handler) => {
      eventHandler = handler as never;
      return Promise.resolve(vi.fn());
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    // Simulate progress event
    act(() => {
      eventHandler?.({ payload: { processed: 50, total: 100 } });
    });

    await waitFor(() => {
      expect(result.current.indexProgress).not.toBeNull();
    });

    // Build index (will fail)
    await act(async () => {
      await result.current.buildIndex(["/home"], false);
    });

    // Progress should be cleared on error
    await waitFor(() => {
      expect(result.current.indexProgress).toBeNull();
    });
  });

  it("should cleanup event listener on unmount", async () => {
    mockInvoke.mockResolvedValue({
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: false,
    });

    const mockUnlisten = vi.fn();

    mockListen.mockImplementation(() => {
      return Promise.resolve(mockUnlisten);
    });

    const { unmount } = renderHook(() => useIndex());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    // Wait a bit for the promise to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    unmount();

    // Wait for cleanup to be called
    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });
});
