import { useEffect, useRef, useState } from "react";
import FileList from "./components/FileList";
import SearchInput from "./components/SearchInput";
import Settings from "./components/Settings";
import { useFileSearch } from "./hooks/useFileSearch";
import { useIndex } from "./hooks/useIndex";
import "./App.css";
import { homeDir } from "@tauri-apps/api/path";

function App() {
  const { search, results, loading, error } = useFileSearch();
  const {
    buildIndex,
    isReady,
    isIndexing,
    getIndexStatus,
    totalFiles,
    lastUpdated,
    indexProgress,
  } = useIndex();
  const [indexInitialized, setIndexInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount (Everything style)
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Auto-build index on app startup (runs in background)
  useEffect(() => {
    const initializeIndex = async () => {
      if (indexInitialized) return;

      const status = await getIndexStatus();

      // If index is not ready and not currently indexing, start indexing
      if (!status.is_ready && !status.indexing_in_progress) {
        setIndexInitialized(true);
        try {
          // Get home directory
          const home = await homeDir();
          // Default paths to index (macOS/Linux)
          // Index home directory for user files
          const defaultPaths = [home];

          // Start indexing in background (non-blocking)
          buildIndex(defaultPaths, false).catch((err) => {
            console.error("Failed to initialize index:", err);
          });
        } catch (err) {
          console.error("Failed to get home directory:", err);
        }
      } else if (status.is_ready) {
        setIndexInitialized(true);
      } else if (status.indexing_in_progress) {
        // Indexing already in progress, just mark as initialized
        setIndexInitialized(true);
      }
    };

    // Small delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      initializeIndex();
    }, 100);

    return () => clearTimeout(timer);
  }, [getIndexStatus, buildIndex, indexInitialized]);

  return (
    <div className="everything-app">
      {error && <div className="error-message">{error}</div>}
      {isIndexing && (
        <div className="indexing-message">
          <div>Indexing files... (This may take a while on first launch)</div>
          {indexProgress && (
            <div className="indexing-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${indexProgress.percentage}%` }} />
              </div>
              <div className="progress-text">
                {indexProgress.processed.toLocaleString()} / {indexProgress.total.toLocaleString()}{" "}
                files ({indexProgress.percentage}%)
              </div>
            </div>
          )}
        </div>
      )}
      {!isReady && !isIndexing && (
        <div className="error-message">Index not ready. Building index...</div>
      )}
      <SearchInput
        ref={searchInputRef}
        onSearch={search}
        loading={loading || isIndexing}
        error={error}
        indexStatus={
          isReady || isIndexing
            ? {
                is_ready: isReady,
                total_files: totalFiles,
                last_updated: lastUpdated,
                indexing_in_progress: isIndexing,
              }
            : null
        }
      />
      <FileList results={results} loading={loading || isIndexing} />
      <button
        type="button"
        className="settings-button"
        onClick={() => setShowSettings(true)}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙️
      </button>
      {showSettings && (
        <>
          <button
            type="button"
            className="settings-overlay"
            onClick={() => setShowSettings(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowSettings(false);
              }
            }}
            aria-label="Close settings"
          />
          <Settings onClose={() => setShowSettings(false)} />
        </>
      )}
    </div>
  );
}

export default App;
