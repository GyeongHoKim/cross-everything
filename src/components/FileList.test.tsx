import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileExplorer } from "../hooks/useFileExplorer";
import type { FileResult } from "../types/search";
import FileList from "./FileList";

vi.mock("../hooks/useFileExplorer");

describe("FileList", () => {
  const mockResults: FileResult[] = [
    {
      name: "test.txt",
      path: "/home/user/test.txt",
      size: 1024,
      modified: "2024-01-01T00:00:00Z",
      is_folder: false,
    },
    {
      name: "Documents",
      path: "/home/user/Documents",
      size: 0,
      modified: "2024-01-02T12:00:00Z",
      is_folder: true,
    },
    {
      name: "large-file.iso",
      path: "/home/user/large-file.iso",
      size: 4_294_967_296,
      modified: "2024-01-03T18:30:00Z",
      is_folder: false,
    },
  ];

  it("should render loading state", () => {
    render(<FileList results={[]} loading={true} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should not render anything when results are empty and not loading", () => {
    const { container } = render(<FileList results={[]} loading={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("should render results table", () => {
    render(<FileList results={mockResults} loading={false} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Date Modified")).toBeInTheDocument();
  });

  it("should render file rows with correct data", () => {
    render(<FileList results={mockResults} loading={false} />);

    expect(screen.getByText("test.txt")).toBeInTheDocument();
    expect(screen.getByText("/home/user/test.txt")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("/home/user/Documents")).toBeInTheDocument();
    expect(screen.getByText("large-file.iso")).toBeInTheDocument();
    expect(screen.getByText("/home/user/large-file.iso")).toBeInTheDocument();
  });

  it("should display file and folder icons", () => {
    render(<FileList results={mockResults} loading={false} />);

    const icons = screen.queryAllByText(/📄|📁/);
    expect(icons).toHaveLength(3);
    expect(icons[0]).toHaveTextContent("📄");
    expect(icons[1]).toHaveTextContent("📁");
    expect(icons[2]).toHaveTextContent("📄");
  });

  it("should format file sizes correctly", () => {
    render(<FileList results={mockResults} loading={false} />);

    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.getByText("4 GB")).toBeInTheDocument();
  });

  it("should not display size for folders", () => {
    render(<FileList results={mockResults} loading={false} />);

    const rows = screen.getAllByRole("row");
    const folderRow = rows[2];
    expect(folderRow).toContainHTML("Documents");
    expect(folderRow).not.toContainHTML("B");
  });

  it("should format dates correctly", () => {
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

    render(<FileList results={mockResults} loading={false} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toContainHTML("test.txt");
    expect(rows[1]).toContainHTML(formatDate("2024-01-01T00:00:00Z"));
    expect(rows[2]).toContainHTML("Documents");
    expect(rows[2]).toContainHTML(formatDate("2024-01-02T12:00:00Z"));
    expect(rows[3]).toContainHTML("large-file.iso");
    expect(rows[3]).toContainHTML(formatDate("2024-01-03T18:30:00Z"));
  });

  it("should handle invalid date strings gracefully", () => {
    const invalidResults: FileResult[] = [
      {
        name: "invalid.txt",
        path: "/home/user/invalid.txt",
        size: 1024,
        modified: "invalid-date",
        is_folder: false,
      },
    ];

    render(<FileList results={invalidResults} loading={false} />);

    expect(screen.getByText("invalid-date")).toBeInTheDocument();
  });

  it("should apply alternating row classes", () => {
    const { container } = render(<FileList results={mockResults} loading={false} />);

    const rows = container.querySelectorAll("tbody tr");
    rows.forEach((row, index) => {
      const expectedClass = index % 2 === 0 ? "row-even" : "row-odd";
      expect(row).toHaveClass(expectedClass);
    });
  });

  it("should make rows focusable", () => {
    const { container } = render(<FileList results={mockResults} loading={false} />);

    const rows = container.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      expect(row).toHaveAttribute("tabIndex", "0");
    });
  });

  it("should include accessibility labels for rows", () => {
    render(<FileList results={mockResults} loading={false} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveAttribute("aria-label", expect.stringContaining("File: test.txt"));
    expect(rows[2]).toHaveAttribute("aria-label", expect.stringContaining("Folder: Documents"));
  });

  it("should handle large file sizes", () => {
    const largeFileResults: FileResult[] = [
      {
        name: "huge.bin",
        path: "/home/user/huge.bin",
        size: 5_497_558_138_880,
        modified: "2024-01-01T00:00:00Z",
        is_folder: false,
      },
    ];

    render(<FileList results={largeFileResults} loading={false} />);

    expect(screen.getByText("5120 GB")).toBeInTheDocument();
  });

  it("should display bytes for files < 1 KB", () => {
    const smallFileResults: FileResult[] = [
      {
        name: "small.txt",
        path: "/home/user/small.txt",
        size: 512,
        modified: "2024-01-01T00:00:00Z",
        is_folder: false,
      },
    ];

    render(<FileList results={smallFileResults} loading={false} />);

    expect(screen.getByText("512 B")).toBeInTheDocument();
  });

  it("should handle zero-size files", () => {
    const zeroFileResults: FileResult[] = [
      {
        name: "empty.txt",
        path: "/home/user/empty.txt",
        size: 0,
        modified: "2024-01-01T00:00:00Z",
        is_folder: false,
      },
    ];

    render(<FileList results={zeroFileResults} loading={false} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).not.toContainHTML("B");
  });

  it("should handle empty results array", () => {
    const { container } = render(<FileList results={[]} loading={false} />);

    expect(container.firstChild).toBeNull();
  });

  describe("double-click handler", () => {
    const mockOpenFileOrDirectory = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      vi.clearAllMocks();
      (useFileExplorer as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        openFileOrDirectory: mockOpenFileOrDirectory,
        showContextMenu: vi.fn(),
        error: null,
        loading: false,
      });
    });

    it("should call openFileOrDirectory when a file row is double-clicked", async () => {
      render(<FileList results={mockResults} loading={false} />);

      const rows = screen.getAllByRole("row");
      const fileRow = rows[1]; // First data row (test.txt)

      fireEvent.doubleClick(fileRow);

      expect(mockOpenFileOrDirectory).toHaveBeenCalledWith("/home/user/test.txt");
    });

    it("should call openFileOrDirectory when a directory row is double-clicked", async () => {
      render(<FileList results={mockResults} loading={false} />);

      const rows = screen.getAllByRole("row");
      const folderRow = rows[2]; // Second data row (Documents)

      fireEvent.doubleClick(folderRow);

      expect(mockOpenFileOrDirectory).toHaveBeenCalledWith("/home/user/Documents");
    });
  });
});
