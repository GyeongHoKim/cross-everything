import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import type { ExplorerError } from "../types/explorer";

// Normalize error from Tauri to ExplorerError format
function normalizeExplorerError(err: unknown): ExplorerError {
  // If already in correct format
  if (
    err &&
    typeof err === "object" &&
    "kind" in err &&
    "message" in err &&
    typeof (err as ExplorerError).kind === "string" &&
    typeof (err as ExplorerError).message === "string"
  ) {
    return err as ExplorerError;
  }

  // Handle Rust enum serialization format: {"OsError": "message"}
  if (err && typeof err === "object") {
    const errObj = err as Record<string, unknown>;
    if ("OsError" in errObj && typeof errObj.OsError === "string") {
      return { kind: "OsError", message: errObj.OsError };
    }
    if ("NotFound" in errObj && typeof errObj.NotFound === "string") {
      return { kind: "NotFound", message: errObj.NotFound };
    }
    if ("PermissionDenied" in errObj && typeof errObj.PermissionDenied === "string") {
      return { kind: "PermissionDenied", message: errObj.PermissionDenied };
    }
    if ("NoDefaultApp" in errObj && typeof errObj.NoDefaultApp === "string") {
      return { kind: "NoDefaultApp", message: errObj.NoDefaultApp };
    }
  }

  // Fallback: convert to string
  const errorMessage =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  return { kind: "OsError", message: errorMessage || "Unknown error" };
}

export interface UseFileExplorerReturn {
  openFileOrDirectory: (path: string) => Promise<void>;
  showContextMenu: (path: string, x?: number, y?: number) => Promise<void>;
  error: ExplorerError | null;
  loading: boolean;
}

export function useFileExplorer(): UseFileExplorerReturn {
  const [error, setError] = useState<ExplorerError | null>(null);
  const [loading, setLoading] = useState(false);

  const openFileOrDirectory = useCallback(async (path: string) => {
    console.log("[useFileExplorer] Opening file/directory:", path);
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      await invoke("open_file_or_directory", { path });
      const duration = performance.now() - startTime;
      console.log(
        `[useFileExplorer] Successfully opened file/directory in ${duration.toFixed(2)}ms:`,
        path,
      );
    } catch (err) {
      const duration = performance.now() - startTime;
      console.error(
        `[useFileExplorer] Failed to open file/directory after ${duration.toFixed(2)}ms:`,
        {
          path,
          error: err,
          errorType: typeof err,
          errorKeys: err && typeof err === "object" ? Object.keys(err) : "N/A",
        },
      );
      // Normalize error format
      const explorerError = normalizeExplorerError(err);
      setError(explorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const showContextMenu = useCallback(async (path: string, x?: number, y?: number) => {
    console.log("[useFileExplorer] Showing context menu:", {
      path,
      coordinates: x !== undefined && y !== undefined ? { x, y } : "mouse position",
    });
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      await invoke("show_context_menu", { path, x, y });
      const duration = performance.now() - startTime;
      console.log(
        `[useFileExplorer] Successfully showed context menu in ${duration.toFixed(2)}ms:`,
        path,
      );
    } catch (err) {
      const duration = performance.now() - startTime;
      console.error(
        `[useFileExplorer] Failed to show context menu after ${duration.toFixed(2)}ms:`,
        {
          path,
          coordinates: x !== undefined && y !== undefined ? { x, y } : "mouse position",
          error: err,
          errorType: typeof err,
          errorKeys: err && typeof err === "object" ? Object.keys(err) : "N/A",
        },
      );
      // Normalize error format
      const explorerError = normalizeExplorerError(err);
      setError(explorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { openFileOrDirectory, showContextMenu, error, loading };
}
