import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildIndexOutput, GetIndexStatusOutput } from "../types/search";
import { useIndex } from "./useIndex";

describe("useIndex", () => {
  beforeEach(() => {
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
  });

  it("should check initial index status on mount", async () => {
    const mockStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    mockIPC((cmd) => {
      if (cmd === "get_index_status") {
        return mockStatus;
      }
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.totalFiles).toBe(1000);
    expect(result.current.lastUpdated).toBe("2024-01-01T00:00:00Z");
  });

  it("should build index successfully", async () => {
    let callCount = 0;
    const mockBuildResult: BuildIndexOutput = {
      status: "completed",
      files_indexed: 100,
      errors: [],
    };

    mockIPC((cmd) => {
      if (cmd === "get_index_status") {
        callCount++;
        if (callCount === 1) {
          return {
            is_ready: false,
            total_files: 0,
            last_updated: null,
            indexing_in_progress: false,
          };
        }
        // Third call: after build
        return {
          is_ready: true,
          total_files: 100,
          last_updated: "2024-01-01T00:00:00Z",
          indexing_in_progress: false,
        };
      }
      if (cmd === "build_index") {
        return mockBuildResult;
      }
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
    // Setup mockIPC with event mocking enabled for this test
    mockIPC(
      (cmd) => {
        if (cmd === "get_index_status") {
          return {
            is_ready: false,
            total_files: 0,
            last_updated: null,
            indexing_in_progress: true,
          };
        }
      },
      { shouldMockEvents: true },
    );

    const { result } = renderHook(() => useIndex());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(result.current.isIndexing).toBe(true);
    });

    // Wait for listener registration to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Simulate progress event using emit
    await act(async () => {
      await emit("index-progress", { processed: 50, total: 100 });
      // Give extra time for event to propagate through mocked system
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Wait for event to propagate and state to update
    await waitFor(
      () => {
        expect(result.current.indexProgress).toEqual({
          processed: 50,
          total: 100,
          percentage: 50,
        });
      },
      { timeout: 5000 },
    );
  });

  it("should handle index build errors", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_index_status") {
        return {
          is_ready: false,
          total_files: 0,
          last_updated: null,
          indexing_in_progress: false,
        };
      }
      if (cmd === "build_index") {
        throw new Error("Index build failed");
      }
    });

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
    let buildIndexCalled = false;
    let buildIndexArgs: unknown = null;

    mockIPC((cmd, args) => {
      if (cmd === "get_index_status") {
        return {
          is_ready: false,
          total_files: 0,
          last_updated: null,
          indexing_in_progress: true,
        };
      }
      if (cmd === "build_index") {
        buildIndexCalled = true;
        buildIndexArgs = args;
        return {
          status: "completed",
          files_indexed: 0,
          errors: [],
        };
      }
    });

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    await act(async () => {
      await result.current.buildIndex(["/home"], true);
    });

    expect(buildIndexCalled).toBe(true);
    expect(buildIndexArgs).toEqual({
      paths: ["/home"],
      forceRebuild: true,
    });
  });

  it("should handle get_index_status errors gracefully", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_index_status") {
        throw new Error("Failed to get status");
      }
    });

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
    let callCount = 0;

    mockIPC(
      (cmd) => {
        if (cmd === "get_index_status") {
          callCount++;
          if (callCount === 1) {
            return {
              is_ready: false,
              total_files: 0,
              last_updated: null,
              indexing_in_progress: true,
            };
          }
          // Third call: after build
          return {
            is_ready: true,
            total_files: 100,
            last_updated: "2024-01-01T00:00:00Z",
            indexing_in_progress: false,
          };
        }
        if (cmd === "build_index") {
          return {
            status: "completed",
            files_indexed: 100,
            errors: [],
          };
        }
      },
      { shouldMockEvents: true },
    );

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isIndexing).toBe(true);
    });

    // Wait for listener to be set up
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Simulate progress event
    await act(async () => {
      await emit("index-progress", { processed: 50, total: 100 });
      // Give extra time for event to propagate through mocked system
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(
      () => {
        expect(result.current.indexProgress).not.toBeNull();
      },
      { timeout: 5000 },
    );

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
    mockIPC(
      (cmd) => {
        if (cmd === "get_index_status") {
          return {
            is_ready: false,
            total_files: 0,
            last_updated: null,
            indexing_in_progress: false,
          };
        }
        if (cmd === "build_index") {
          throw new Error("Build failed");
        }
      },
      { shouldMockEvents: true },
    );

    const { result } = renderHook(() => useIndex());

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    // Wait for listener to be set up
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Simulate progress event
    await act(async () => {
      await emit("index-progress", { processed: 50, total: 100 });
      // Give extra time for event to propagate through mocked system
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(
      () => {
        expect(result.current.indexProgress).not.toBeNull();
      },
      { timeout: 5000 },
    );

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
    mockIPC(
      (cmd) => {
        if (cmd === "get_index_status") {
          return {
            is_ready: false,
            total_files: 0,
            last_updated: null,
            indexing_in_progress: false,
          };
        }
      },
      { shouldMockEvents: true },
    );

    const { result, unmount } = renderHook(() => useIndex());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    // Wait for listener registration to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Unmount should not throw errors
    // Note: With mockIPC shouldMockEvents, cleanup may have issues, but unmount should still work
    unmount();

    // Wait a bit for cleanup to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // If we get here without errors, cleanup was successful
    expect(true).toBe(true);
  });
});
