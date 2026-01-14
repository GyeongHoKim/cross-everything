import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import type { ExplorerError } from "../types/explorer";

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
        },
      );
      const explorerError = err as ExplorerError;
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
        },
      );
      const explorerError = err as ExplorerError;
      setError(explorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { openFileOrDirectory, showContextMenu, error, loading };
}
