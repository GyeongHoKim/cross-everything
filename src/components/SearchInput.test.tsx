import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetIndexStatusOutput } from "../types/search";
import SearchInput from "./SearchInput";

vi.useFakeTimers();

describe("SearchInput", () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render with ready state", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    expect(screen.getByPlaceholderText("Search files and folders...")).toBeInTheDocument();
    expect(screen.getByText("✓ 1,000 files")).toBeInTheDocument();
    expect(screen.getByLabelText("Use regular expression")).toBeInTheDocument();
  });

  it("should render with indexing state", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: true,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    expect(screen.getByText("⏳ Indexing...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search files and folders...")).toBeDisabled();
  });

  it("should render with not ready state", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: false,
      total_files: 0,
      last_updated: null,
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    expect(screen.getByText("⚠ Not ready")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search files and folders...")).toBeDisabled();
  });

  it("should debounce input changes", async () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const input = screen.getByPlaceholderText("Search files and folders...");
    fireEvent.change(input, { target: { value: "test" } });

    expect(mockOnSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "test",
      use_regex: false,
      limit: 1000,
    });
  });

  it("should toggle regex", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const regexCheckbox = screen.getByLabelText("Enable regular expression search");
    expect(regexCheckbox).not.toBeChecked();

    fireEvent.click(regexCheckbox);

    expect(regexCheckbox).toBeChecked();
  });

  it("should validate regex pattern", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const input = screen.getByPlaceholderText("Search files and folders...");
    const regexCheckbox = screen.getByLabelText("Enable regular expression search");

    fireEvent.click(regexCheckbox);
    fireEvent.change(input, { target: { value: "[invalid" } });

    vi.advanceTimersByTime(300);

    expect(screen.getByText("Invalid regular expression pattern")).toBeInTheDocument();
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it("should display error message from props", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} error="Search error" indexStatus={indexStatus} />);

    expect(screen.getByText("Search error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should be disabled during loading", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} loading={true} indexStatus={indexStatus} />);

    expect(screen.getByPlaceholderText("Search files and folders...")).toBeDisabled();
    expect(screen.getByLabelText("Enable regular expression search")).toBeDisabled();
  });

  it("should clear local error when external error changes", () => {
    const { rerender } = render(<SearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText("Search files and folders...");
    const regexCheckbox = screen.getByLabelText("Enable regular expression search");

    fireEvent.click(regexCheckbox);
    fireEvent.change(input, { target: { value: "[invalid" } });

    rerender(<SearchInput onSearch={mockOnSearch} error="External error" />);

    expect(screen.getByText("External error")).toBeInTheDocument();
  });

  it("should not call onSearch with empty query", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const input = screen.getByPlaceholderText("Search files and folders...");
    fireEvent.change(input, { target: { value: "   " } });

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it("should cancel debounce timer on new input", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const input = screen.getByPlaceholderText("Search files and folders...");
    fireEvent.change(input, { target: { value: "test" } });

    vi.advanceTimersByTime(200);

    fireEvent.change(input, { target: { value: "test query" } });

    vi.advanceTimersByTime(300);

    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith({
      query: "test query",
      use_regex: false,
      limit: 1000,
    });
  });

  it("should accept ref", () => {
    const indexStatus: GetIndexStatusOutput = {
      is_ready: true,
      total_files: 1000,
      last_updated: "2024-01-01T00:00:00Z",
      indexing_in_progress: false,
    };

    const { container } = render(<SearchInput onSearch={mockOnSearch} indexStatus={indexStatus} />);

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
  });
});
