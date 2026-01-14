import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExplorerError } from "../types/explorer";
import { useFileExplorer } from "./useFileExplorer";

describe("useFileExplorer", () => {
  beforeEach(() => {
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
  });

  describe("openFileOrDirectory", () => {
    it("should call invoke with correct parameters", async () => {
      let calledWith: unknown = null;

      mockIPC((cmd, args) => {
        if (cmd === "open_file_or_directory") {
          calledWith = args;
          return undefined;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);

      await act(async () => {
        await result.current.openFileOrDirectory("/path/to/file");
      });

      expect(calledWith).toEqual({ path: "/path/to/file" });
    });

    it("should set loading state during operation", async () => {
      let resolveInvoke: () => void;
      const invokePromise = new Promise<void>((resolve) => {
        resolveInvoke = resolve;
      });

      mockIPC((cmd) => {
        if (cmd === "open_file_or_directory") {
          return invokePromise;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      act(() => {
        result.current.openFileOrDirectory("/path/to/file").catch(() => {});
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        resolveInvoke?.();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle errors and set error state", async () => {
      const mockError: ExplorerError = {
        kind: "NotFound",
        message: "File not found",
        path: "/path/to/file",
      };

      mockIPC((cmd) => {
        if (cmd === "open_file_or_directory") {
          throw mockError;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        try {
          await result.current.openFileOrDirectory("/path/to/file");
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("showContextMenu", () => {
    it("should call invoke with correct parameters", async () => {
      let calledWith: unknown = null;

      mockIPC((cmd, args) => {
        if (cmd === "show_context_menu") {
          calledWith = args;
          return undefined;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        await result.current.showContextMenu("/path/to/file", 100, 200);
      });

      expect(calledWith).toEqual({
        path: "/path/to/file",
        x: 100,
        y: 200,
      });
    });

    it("should call invoke without coordinates when not provided", async () => {
      let calledWith: unknown = null;

      mockIPC((cmd, args) => {
        if (cmd === "show_context_menu") {
          calledWith = args;
          return undefined;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        await result.current.showContextMenu("/path/to/file");
      });

      expect(calledWith).toEqual({
        path: "/path/to/file",
        x: undefined,
        y: undefined,
      });
    });

    it("should handle errors and set error state", async () => {
      const mockError: ExplorerError = {
        kind: "PermissionDenied",
        message: "Permission denied",
        path: "/path/to/file",
      };

      mockIPC((cmd) => {
        if (cmd === "show_context_menu") {
          throw mockError;
        }
      });

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        try {
          await result.current.showContextMenu("/path/to/file");
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
