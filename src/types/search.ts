// TypeScript types for search API matching contracts/search-api.md

export interface SearchFilesInput {
  query: string;
  use_regex: boolean;
  limit?: number;
}

export interface FileResult {
  name: string;
  path: string;
  size: number;
  modified: string; // ISO 8601 date string
  is_folder: boolean;
}

export interface SearchFilesOutput {
  results: FileResult[];
  total_found: number;
  search_time_ms: number;
}

export interface BuildIndexInput {
  paths: string[];
  force_rebuild: boolean;
}

export interface BuildIndexOutput {
  status: "started" | "completed" | "failed";
  files_indexed: number;
  errors: string[];
}

export interface GetIndexStatusOutput {
  is_ready: boolean;
  total_files: number;
  last_updated: string | null; // ISO 8601 or null if never
  indexing_in_progress: boolean;
}
