import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

vi.mock("../hooks/useAutostart", () => ({
  useAutostart: vi.fn(),
}));

import { useAutostart } from "../hooks/useAutostart";

describe("Settings", () => {
  const mockToggleAutostart = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: false,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: mockToggleAutostart,
      loading: false,
    });
  });

  it("should render settings with autostart toggle", () => {
    render(<Settings />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Start at Login")).toBeInTheDocument();
    expect(
      screen.getByText("Automatically start CrossEverything when you log in"),
    ).toBeInTheDocument();
  });

  it("should render close button when onClose is provided", () => {
    render(<Settings onClose={mockClose} />);

    const closeButton = screen.getByLabelText("Close settings");
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent("×");
  });

  it("should not render close button when onClose is not provided", () => {
    render(<Settings />);

    expect(screen.queryByLabelText("Close settings")).not.toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(<Settings onClose={mockClose} />);

    const closeButton = screen.getByLabelText("Close settings");
    fireEvent.click(closeButton);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("should render toggle checkbox when autostart is disabled", () => {
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: false,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: mockToggleAutostart,
      loading: false,
    });

    render(<Settings />);

    const toggle = screen.getByLabelText("Enable start at login");
    expect(toggle).not.toBeChecked();
  });

  it("should render toggle checkbox when autostart is enabled", () => {
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: true,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: mockToggleAutostart,
      loading: false,
    });

    render(<Settings />);

    const toggle = screen.getByLabelText("Enable start at login");
    expect(toggle).toBeChecked();
  });

  it("should call toggleAutostart when toggle is clicked", () => {
    render(<Settings />);

    const toggle = screen.getByLabelText("Enable start at login");
    fireEvent.click(toggle);

    expect(mockToggleAutostart).toHaveBeenCalledTimes(1);
  });

  it("should disable toggle when loading", () => {
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: false,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: mockToggleAutostart,
      loading: true,
    });

    render(<Settings />);

    const toggle = screen.getByLabelText("Enable start at login");
    expect(toggle).toBeDisabled();
  });

  it("should enable toggle when not loading", () => {
    (useAutostart as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAutostartEnabled: false,
      enableAutostart: vi.fn(),
      disableAutostart: vi.fn(),
      toggleAutostart: mockToggleAutostart,
      loading: false,
    });

    render(<Settings />);

    const toggle = screen.getByLabelText("Enable start at login");
    expect(toggle).not.toBeDisabled();
  });

  it("should render settings container", () => {
    const { container } = render(<Settings />);

    expect(container.querySelector(".settings-container")).toBeInTheDocument();
    expect(container.querySelector(".settings-header")).toBeInTheDocument();
    expect(container.querySelector(".settings-content")).toBeInTheDocument();
  });

  it("should render settings item with toggle", () => {
    const { container } = render(<Settings />);

    expect(container.querySelector(".settings-item")).toBeInTheDocument();
    expect(container.querySelector(".settings-label")).toBeInTheDocument();
    expect(container.querySelector(".settings-description")).toBeInTheDocument();
    expect(container.querySelector(".settings-toggle")).toBeInTheDocument();
  });
});
