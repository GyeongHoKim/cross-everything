// TypeScript types for file explorer operations

export interface ExplorerError {
  kind: "NotFound" | "PermissionDenied" | "NoDefaultApp" | "OsError";
  message: string;
  path?: string;
}
