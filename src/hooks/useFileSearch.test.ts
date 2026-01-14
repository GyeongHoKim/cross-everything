import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FileResult, SearchFilesOutput } from "../types/search";
import { useFileSearch } from "./useFileSearch";

describe("useFileSearch", () => {
  beforeEach(() => {
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
  });

  it("should search successfully with results", async () => {
    const mockResults: FileResult[] = [
      {
        name: "test.txt",
        path: "/path/to/test.txt",
        size: 1024,
        modified: "2024-01-01T00:00:00Z",
        is_folder: false,
      },
    ];
    const mockResponse: SearchFilesOutput = {
      results: mockResults,
      total_found: 1,
      search_time_ms: 10,
    };

    let calledWith: unknown = null;

    mockIPC((cmd, args) => {
      if (cmd === "search_files") {
        calledWith = args;
        return mockResponse;
      }
    });

    const { result } = renderHook(() => useFileSearch());

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await result.current.search({ query: "test", use_regex: false });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.results).toEqual(mockResults);
        expect(result.current.error).toBe(null);
      },
      { timeout: 1000 },
    );

    expect(calledWith).toEqual({
      query: "test",
      useRegex: false,
      limit: 1000,
    });
  });

  it("should handle INVALID_REGEX error", async () => {
    mockIPC((cmd) => {
      if (cmd === "search_files") {
        throw "INVALID_REGEX";
      }
    });

    const { result } = renderHook(() => useFileSearch());

    await act(async () => {
      await result.current.search({ query: "[invalid", use_regex: true });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Invalid regular expression pattern");
        expect(result.current.results).toEqual([]);
      },
      { timeout: 1000 },
    );
  });

  it("should handle INDEX_NOT_READY error", async () => {
    mockIPC((cmd) => {
      if (cmd === "search_files") {
        throw "INDEX_NOT_READY";
      }
    });

    const { result } = renderHook(() => useFileSearch());

    await act(async () => {
      await result.current.search({ query: "test", use_regex: false });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(
          "Search index is not ready. Please build the index first.",
        );
        expect(result.current.results).toEqual([]);
      },
      { timeout: 1000 },
    );
  });

  it("should handle generic error from Error object", async () => {
    mockIPC((cmd) => {
      if (cmd === "search_files") {
        throw new Error("Network error");
      }
    });

    const { result } = renderHook(() => useFileSearch());

    await act(async () => {
      await result.current.search({ query: "test", use_regex: false });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Network error");
        expect(result.current.results).toEqual([]);
      },
      { timeout: 1000 },
    );
  });

  it("should handle unknown error type", async () => {
    mockIPC((cmd) => {
      if (cmd === "search_files") {
        throw 500;
      }
    });

    const { result } = renderHook(() => useFileSearch());

    await act(async () => {
      await result.current.search({ query: "test", use_regex: false });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("An error occurred during search");
        expect(result.current.results).toEqual([]);
      },
      { timeout: 1000 },
    );
  });

  it("should manage loading state transitions", async () => {
    mockIPC((cmd) => {
      if (cmd === "search_files") {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                results: [],
                total_found: 0,
                search_time_ms: 10,
              }),
            100,
          ),
        );
      }
    });

    const { result } = renderHook(() => useFileSearch());

    act(() => {
      result.current.search({ query: "test", use_regex: false });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 },
    );

    expect(result.current.results).toEqual([]);
  });

  it("should use custom limit when provided", async () => {
    const mockResponse: SearchFilesOutput = {
      results: [],
      total_found: 0,
      search_time_ms: 10,
    };

    let calledWith: unknown = null;

    mockIPC((cmd, args) => {
      if (cmd === "search_files") {
        calledWith = args;
        return mockResponse;
      }
    });

    const { result } = renderHook(() => useFileSearch());

    await act(async () => {
      await result.current.search({ query: "test", use_regex: false, limit: 500 });
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 1000 },
    );

    expect(calledWith).toEqual({
      query: "test",
      useRegex: false,
      limit: 500,
    });
  });
});
