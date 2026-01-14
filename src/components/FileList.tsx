import { useEffect, useState } from "react";
import { useFileExplorer } from "../hooks/useFileExplorer";
import type { ExplorerError } from "../types/explorer";
import type { FileResult } from "../types/search";
import ErrorDialog from "./ErrorDialog";

// Normalize error from Tauri to ExplorerError format (same as in useFileExplorer)
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

interface FileListProps {
  results: FileResult[];
  loading?: boolean;
}

export default function FileList({ results, loading = false }: FileListProps) {
  const { openFileOrDirectory, showContextMenu, error } = useFileExplorer();
  const [displayError, setDisplayError] = useState<ExplorerError | null>(null);

  // Update display error when hook error changes
  useEffect(() => {
    if (error) {
      setDisplayError(error);
    }
  }, [error]);

  const handleDoubleClick = async (file: FileResult) => {
    console.log("[FileList] Double-click detected:", {
      name: file.name,
      path: file.path,
      is_folder: file.is_folder,
    });
    try {
      await openFileOrDirectory(file.path);
      console.log("[FileList] Successfully opened:", file.path);
    } catch (err) {
      console.error("[FileList] Failed to open file/directory:", {
        path: file.path,
        error: err,
        errorType: typeof err,
        errorKeys: err && typeof err === "object" ? Object.keys(err) : "N/A",
      });
      // Normalize error format and ensure dialog is shown
      const explorerError = normalizeExplorerError(err);
      setDisplayError(explorerError);
    }
  };

  const handleRightClick = async (file: FileResult, event: React.MouseEvent) => {
    event.preventDefault();
    console.log("[FileList] Right-click detected:", {
      name: file.name,
      path: file.path,
      is_folder: file.is_folder,
      coordinates: { x: event.clientX, y: event.clientY },
    });
    try {
      await showContextMenu(file.path, event.clientX, event.clientY);
      console.log("[FileList] Successfully showed context menu:", file.path);
    } catch (err) {
      console.error("[FileList] Failed to show context menu:", {
        path: file.path,
        coordinates: { x: event.clientX, y: event.clientY },
        error: err,
        errorType: typeof err,
        errorKeys: err && typeof err === "object" ? Object.keys(err) : "N/A",
      });
      // Normalize error format and ensure dialog is shown
      const explorerError = normalizeExplorerError(err);
      setDisplayError(explorerError);
    }
  };

  const handleCloseError = () => {
    setDisplayError(null);
  };
  if (loading) {
    return <div className="file-list-loading">Loading...</div>;
  }

  if (results.length === 0) {
    return null; // Everything doesn't show message when empty
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(0)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return dateStr;
      }
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <ErrorDialog error={displayError} onClose={handleCloseError} />
      <section className="file-list-container" aria-label="Search results">
        <table className="file-list-table" aria-label="File search results">
          <thead>
            <tr>
              <th className="col-name" scope="col">
                Name
              </th>
              <th className="col-path" scope="col">
                Path
              </th>
              <th className="col-size" scope="col">
                Size
              </th>
              <th className="col-date" scope="col">
                Date Modified
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((file, index) => (
              <tr
                key={`${file.path}-${index}`}
                className={index % 2 === 0 ? "row-even" : "row-odd"}
                tabIndex={0}
                onDoubleClick={() => handleDoubleClick(file)}
                onContextMenu={(e) => handleRightClick(file, e)}
                aria-label={`${file.is_folder ? "Folder" : "File"}: ${file.name}, Path: ${file.path}, Size: ${formatSize(file.size)}, Modified: ${formatDate(file.modified)}`}
              >
                <td className="col-name">
                  <span className="file-icon" aria-hidden="true">
                    {file.is_folder ? "📁" : "📄"}
                  </span>
                  {file.name}
                </td>
                <td className="col-path">{file.path}</td>
                <td className="col-size">{formatSize(file.size)}</td>
                <td className="col-date">{formatDate(file.modified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
