import { homeDir } from "@tauri-apps/api/path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAutostart } from "./hooks/useAutostart";
import { useFileSearch } from "./hooks/useFileSearch";
import { useIndex } from "./hooks/useIndex";

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(),
}));

vi.mock("./hooks/useFileSearch", () => ({
  useFileSearch: vi.fn(),
}));

vi.mock("./hooks/useIndex", () => ({
  useIndex: vi.fn(),
}));

vi.mock("./hooks/useAutostart", () => ({
  useAutostart: vi.fn(),
}));

describe("App", () => {
  const mockHomeDir = homeDir as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useAutostart
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: false,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: vi.fn(),
      loading: false,
    });
  });

  it("should render app with initial state", () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    expect(screen.getByPlaceholderText("Search files and folders...")).toBeInTheDocument();
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
  });

  it("should auto-focus search input on mount", () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    const searchInput = screen.getByPlaceholderText("Search files and folders...");
    expect(searchInput).toHaveFocus();
  });

  it("should toggle settings overlay", async () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();

    const settingsButton = screen.getByTitle("Settings");
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    const overlay = screen
      .getAllByLabelText("Close settings")
      .find((btn) => btn.className === "settings-overlay");
    expect(overlay).toBeDefined();
    expect(overlay).toBeInTheDocument();
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });

  it("should display error message when error exists", () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: "Search error",
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    // Error message can appear in both App and SearchInput components
    const errorMessages = screen.getAllByText("Search error");
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("should display indexing message when indexing", () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: false,
        total_files: 0,
        last_updated: null,
        indexing_in_progress: true,
      }),
      isReady: false,
      isIndexing: true,
      totalFiles: 0,
      lastUpdated: null,
      indexProgress: {
        processed: 50,
        total: 100,
        percentage: 50,
      },
    });

    render(<App />);

    expect(screen.getByText(/Indexing files/)).toBeInTheDocument();
    expect(screen.getByText("50 / 100 files (50%)")).toBeInTheDocument();
  });

  it("should initialize index on mount when not ready", async () => {
    mockHomeDir.mockResolvedValue("/home/user");

    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    const mockBuildIndex = vi.fn();
    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: mockBuildIndex,
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: false,
        total_files: 0,
        last_updated: null,
        indexing_in_progress: false,
      }),
      isReady: false,
      isIndexing: false,
      totalFiles: 0,
      lastUpdated: null,
      indexProgress: null,
    });

    render(<App />);

    await waitFor(
      () => {
        expect(mockBuildIndex).toHaveBeenCalledWith(["/home/user"], false);
      },
      { timeout: 200 },
    );
  });

  it("should not initialize index when already ready", async () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    const mockBuildIndex = vi.fn();
    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: mockBuildIndex,
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    await waitFor(
      () => {
        expect(mockBuildIndex).not.toHaveBeenCalled();
      },
      { timeout: 200 },
    );
  });

  it("should not initialize index when already indexing", async () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    const mockBuildIndex = vi.fn();
    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: mockBuildIndex,
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: false,
        total_files: 0,
        last_updated: null,
        indexing_in_progress: true,
      }),
      isReady: false,
      isIndexing: true,
      totalFiles: 0,
      lastUpdated: null,
      indexProgress: null,
    });

    render(<App />);

    await waitFor(
      () => {
        expect(mockBuildIndex).not.toHaveBeenCalled();
      },
      { timeout: 200 },
    );
  });

  it("should close settings with Escape key", async () => {
    (useFileSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      search: vi.fn(),
      results: [],
      loading: false,
      error: null,
    });

    (useIndex as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      buildIndex: vi.fn(),
      getIndexStatus: vi.fn().mockResolvedValue({
        is_ready: true,
        total_files: 1000,
        last_updated: "2024-01-01T00:00:00Z",
        indexing_in_progress: false,
      }),
      isReady: true,
      isIndexing: false,
      totalFiles: 1000,
      lastUpdated: "2024-01-01T00:00:00Z",
      indexProgress: null,
    });

    render(<App />);

    const settingsButton = screen.getByTitle("Settings");
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    const overlay = screen
      .getAllByLabelText("Close settings")
      .find((btn) => btn.className === "settings-overlay");
    expect(overlay).toBeDefined();
    if (overlay) {
      fireEvent.keyDown(overlay, { key: "Escape" });
    }

    await waitFor(() => {
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });
});
