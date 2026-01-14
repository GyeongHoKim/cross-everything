import { useEffect, useState } from "react";
import { useFileExplorer } from "../hooks/useFileExplorer";
import type { ExplorerError } from "../types/explorer";
import type { FileResult } from "../types/search";
import ErrorDialog from "./ErrorDialog";

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
    try {
      await openFileOrDirectory(file.path);
    } catch (err) {
      // Error is already set in hook, just ensure dialog is shown
      const explorerError = err as ExplorerError;
      setDisplayError(explorerError);
    }
  };

  const handleRightClick = async (file: FileResult, event: React.MouseEvent) => {
    event.preventDefault();
    try {
      await showContextMenu(file.path, event.clientX, event.clientY);
    } catch (err) {
      // Error is already set in hook, just ensure dialog is shown
      const explorerError = err as ExplorerError;
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
