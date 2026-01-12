import { forwardRef, useEffect, useState } from "react";
import type { GetIndexStatusOutput, SearchFilesInput } from "../types/search";

interface SearchInputProps {
  onSearch: (input: SearchFilesInput) => void;
  loading?: boolean;
  error?: string | null;
  indexStatus?: GetIndexStatusOutput | null;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, loading = false, error = null, indexStatus = null }, ref) => {
    const [query, setQuery] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Real-time search like Everything (debounced)
    useEffect(() => {
      if (!query.trim()) {
        setLocalError(null);
        return;
      }

      // Validate regex if enabled
      if (useRegex) {
        try {
          new RegExp(query.trim());
          setLocalError(null);
        } catch (_e) {
          setLocalError("Invalid regular expression pattern");
          return;
        }
      } else {
        setLocalError(null);
      }

      const timer = setTimeout(() => {
        onSearch({
          query: query.trim(),
          use_regex: useRegex,
          limit: 1000,
        });
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }, [query, useRegex, onSearch]);

    // Clear local error when external error changes
    useEffect(() => {
      if (error) {
        setLocalError(error);
      }
    }, [error]);

    const displayError = localError || error;
    const isIndexReady = indexStatus?.is_ready ?? false;
    const isIndexing = indexStatus?.indexing_in_progress ?? false;

    return (
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and folders..."
            disabled={loading || !isIndexReady}
            className="search-input"
            aria-label="Search files and folders"
            aria-describedby={displayError ? "search-error" : "search-status"}
            aria-invalid={!!displayError}
            aria-busy={loading}
          />
          <div className="search-controls">
            <label className="regex-checkbox" aria-label="Use regular expression">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                disabled={loading || !isIndexReady}
                aria-label="Enable regular expression search"
              />
              <span>Regex</span>
            </label>
            {indexStatus && (
              <div
                className={`index-status ${isIndexReady ? "ready" : isIndexing ? "indexing" : "not-ready"}`}
                id="search-status"
                aria-live="polite"
                aria-atomic="true"
              >
                {isIndexReady ? (
                  <span
                    className="status-indicator ready"
                    title={`Index ready: ${indexStatus.total_files} files indexed`}
                  >
                    ✓ {indexStatus.total_files.toLocaleString()} files
                  </span>
                ) : isIndexing ? (
                  <span className="status-indicator indexing" title="Indexing in progress...">
                    ⏳ Indexing...
                  </span>
                ) : (
                  <span className="status-indicator not-ready" title="Index not ready">
                    ⚠ Not ready
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {displayError && (
          <div
            id="search-error"
            className="search-error-message"
            role="alert"
            aria-live="assertive"
          >
            {displayError}
          </div>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";

export default SearchInput;
