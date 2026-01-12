import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { BuildIndexOutput, GetIndexStatusOutput } from "../types/search";

interface IndexProgressEvent {
  processed: number;
  total: number;
}

interface UseIndexReturn {
  buildIndex: (paths: string[], forceRebuild?: boolean) => Promise<void>;
  getIndexStatus: () => Promise<GetIndexStatusOutput>;
  isReady: boolean;
  isIndexing: boolean;
  totalFiles: number;
  lastUpdated: string | null;
  indexProgress: {
    processed: number;
    total: number;
    percentage: number;
  } | null;
}

export function useIndex(): UseIndexReturn {
  const [isReady, setIsReady] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [indexProgress, setIndexProgress] = useState<{
    processed: number;
    total: number;
    percentage: number;
  } | null>(null);

  const getIndexStatus = useCallback(async () => {
    try {
      const status = (await invoke("get_index_status")) as GetIndexStatusOutput;
      setIsReady(status.is_ready);
      setIsIndexing(status.indexing_in_progress);
      setTotalFiles(status.total_files);
      setLastUpdated(status.last_updated);
      return status;
    } catch (err) {
      console.error("Failed to get index status:", err);
      return {
        is_ready: false,
        total_files: 0,
        last_updated: null,
        indexing_in_progress: false,
      };
    }
  }, []);

  const buildIndex = useCallback(
    async (paths: string[], forceRebuild = false) => {
      setIsIndexing(true);
      setIndexProgress(null); // Reset progress
      try {
        const result = (await invoke("build_index", {
          paths,
          forceRebuild,
        })) as BuildIndexOutput;

        if (result.status === "completed") {
          await getIndexStatus();
          setIndexProgress(null); // Clear progress when done
        } else {
          console.error("Index build failed:", result.errors);
        }
      } catch (err) {
        console.error("Failed to build index:", err);
      } finally {
        setIsIndexing(false);
        setIndexProgress(null); // Clear progress on error
      }
    },
    [getIndexStatus],
  );

  // Listen for index progress events
  useEffect(() => {
    const setupProgressListener = async () => {
      const unlisten = await listen<IndexProgressEvent>("index-progress", (event) => {
        const { processed, total } = event.payload;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        setIndexProgress({ processed, total, percentage });
        console.log(`[INDEX] Progress: ${processed}/${total} files (${percentage}%)`);
      });

      return () => {
        unlisten();
      };
    };

    let cleanup: (() => void) | undefined;
    setupProgressListener().then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // Check index status on mount
  useEffect(() => {
    getIndexStatus();
  }, [getIndexStatus]);

  return {
    buildIndex,
    getIndexStatus,
    isReady,
    isIndexing,
    totalFiles,
    lastUpdated,
    indexProgress,
  };
}
