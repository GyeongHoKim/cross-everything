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
    setLoading(true);
    setError(null);
    try {
      await invoke("open_file_or_directory", { path });
    } catch (err) {
      const explorerError = err as ExplorerError;
      setError(explorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const showContextMenu = useCallback(async (path: string, x?: number, y?: number) => {
    setLoading(true);
    setError(null);
    try {
      await invoke("show_context_menu", { path, x, y });
    } catch (err) {
      const explorerError = err as ExplorerError;
      setError(explorerError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { openFileOrDirectory, showContextMenu, error, loading };
}
