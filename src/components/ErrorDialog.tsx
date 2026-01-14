import { useEffect } from "react";
import type { ExplorerError } from "../types/explorer";

interface ErrorDialogProps {
  error: ExplorerError | null;
  onClose: () => void;
}

export default function ErrorDialog({ error, onClose }: ErrorDialogProps) {
  useEffect(() => {
    // Auto-close after 5 seconds if error is shown
    if (error) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, onClose]);

  if (!error) {
    return null;
  }

  const getErrorMessage = (err: ExplorerError): string => {
    // Handle case where error might be in different format
    if (!err || typeof err !== "object") {
      return "An unknown error occurred";
    }

    // Check if error is in the expected format
    if (!("kind" in err) || !("message" in err)) {
      console.error("[ErrorDialog] Unexpected error format:", err);
      // Try to extract message from different possible formats
      const errAny = err as Record<string, unknown>;
      if ("OsError" in errAny && typeof errAny.OsError === "string") {
        return `System error: ${errAny.OsError}`;
      }
      if ("NotFound" in errAny && typeof errAny.NotFound === "string") {
        return `File or directory not found: ${errAny.NotFound}`;
      }
      if ("PermissionDenied" in errAny && typeof errAny.PermissionDenied === "string") {
        return `Permission denied: ${errAny.PermissionDenied}`;
      }
      if ("NoDefaultApp" in errAny && typeof errAny.NoDefaultApp === "string") {
        return `No default application found: ${errAny.NoDefaultApp}`;
      }
      return `An error occurred: ${JSON.stringify(err)}`;
    }

    switch (err.kind) {
      case "NotFound":
        // Extract path from message if it contains path information
        return `File or directory not found: ${err.message}`;
      case "PermissionDenied":
        return `Permission denied: ${err.message}`;
      case "NoDefaultApp":
        return `No default application found for: ${err.message}`;
      case "OsError":
        return `System error: ${err.message}`;
      default:
        return `An error occurred: ${err.message || JSON.stringify(err)}`;
    }
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      onClose();
    }
  };

  return (
    <div
      className="error-dialog-overlay"
      role="dialog"
      aria-labelledby="error-dialog-title"
      aria-modal="true"
    >
      <button
        type="button"
        className="error-dialog-backdrop"
        onClick={onClose}
        onKeyDown={handleOverlayKeyDown}
        aria-label="Close dialog"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      />
      <div className="error-dialog" role="document">
        <div className="error-dialog-header">
          <h2 id="error-dialog-title" className="error-dialog-title">
            Error
          </h2>
          <button
            type="button"
            className="error-dialog-close"
            onClick={onClose}
            aria-label="Close error dialog"
          >
            ×
          </button>
        </div>
        <div className="error-dialog-body">
          <p className="error-dialog-message">{getErrorMessage(error)}</p>
        </div>
        <div className="error-dialog-footer">
          <button type="button" className="error-dialog-button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
