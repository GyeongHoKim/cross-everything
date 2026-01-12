import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import type { FileResult, SearchFilesInput, SearchFilesOutput } from "../types/search";

interface UseFileSearchReturn {
  search: (input: SearchFilesInput) => Promise<void>;
  results: FileResult[];
  loading: boolean;
  error: string | null;
}

export function useFileSearch(): UseFileSearchReturn {
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (input: SearchFilesInput) => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoke<SearchFilesOutput>("search_files", {
        query: input.query,
        useRegex: input.use_regex,
        limit: input.limit ?? 1000,
      });

      setResults(response.results);
    } catch (err) {
      const errorMessage =
        err === "INVALID_REGEX"
          ? "Invalid regular expression pattern"
          : err === "INDEX_NOT_READY"
            ? "Search index is not ready. Please build the index first."
            : err instanceof Error
              ? err.message
              : "An error occurred during search";
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, results, loading, error };
}
