import { invoke } from "@tauri-apps/api/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExplorerError } from "../types/explorer";
import { useFileExplorer } from "./useFileExplorer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useFileExplorer", () => {
  const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("openFileOrDirectory", () => {
    it("should call invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileExplorer());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);

      await act(async () => {
        await result.current.openFileOrDirectory("/path/to/file");
      });

      expect(mockInvoke).toHaveBeenCalledWith("open_file_or_directory", {
        path: "/path/to/file",
      });
    });

    it("should set loading state during operation", async () => {
      let resolveInvoke: () => void;
      const invokePromise = new Promise<void>((resolve) => {
        resolveInvoke = resolve;
      });
      mockInvoke.mockReturnValue(invokePromise);

      const { result } = renderHook(() => useFileExplorer());

      act(() => {
        result.current.openFileOrDirectory("/path/to/file").catch(() => {});
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        resolveInvoke!();
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
      mockInvoke.mockRejectedValue(mockError);

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
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        await result.current.showContextMenu("/path/to/file", 100, 200);
      });

      expect(mockInvoke).toHaveBeenCalledWith("show_context_menu", {
        path: "/path/to/file",
        x: 100,
        y: 200,
      });
    });

    it("should call invoke without coordinates when not provided", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileExplorer());

      await act(async () => {
        await result.current.showContextMenu("/path/to/file");
      });

      expect(mockInvoke).toHaveBeenCalledWith("show_context_menu", {
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
      mockInvoke.mockRejectedValue(mockError);

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
