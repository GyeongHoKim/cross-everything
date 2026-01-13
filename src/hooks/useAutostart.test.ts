import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAutostart } from "./useAutostart";

const { mockIsEnabled, mockEnable, mockDisable } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockEnable: vi.fn(),
  mockDisable: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  disable: mockDisable,
  enable: mockEnable,
  isEnabled: mockIsEnabled,
}));

describe("useAutostart", () => {
  it("should check autostart status on mount", async () => {
    mockIsEnabled.mockResolvedValue(false);

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(mockIsEnabled).toHaveBeenCalled();
    });

    expect(result.current.isAutostartEnabled).toBe(false);
  });

  it("should enable autostart", async () => {
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(false);
    });

    await act(async () => {
      await result.current.enableAutostart();
    });

    expect(mockEnable).toHaveBeenCalled();
    expect(result.current.isAutostartEnabled).toBe(true);
  });

  it("should disable autostart", async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockDisable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(true);
    });

    await act(async () => {
      await result.current.disableAutostart();
    });

    expect(mockDisable).toHaveBeenCalled();
    expect(result.current.isAutostartEnabled).toBe(false);
  });

  it("should toggle autostart from enabled to disabled", async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockDisable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(true);
    });

    await act(async () => {
      await result.current.toggleAutostart();
    });

    expect(mockDisable).toHaveBeenCalled();
    expect(result.current.isAutostartEnabled).toBe(false);
  });

  it("should toggle autostart from disabled to enabled", async () => {
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(false);
    });

    await act(async () => {
      await result.current.toggleAutostart();
    });

    expect(mockEnable).toHaveBeenCalled();
    expect(result.current.isAutostartEnabled).toBe(true);
  });

  it("should handle enable autostart error", async () => {
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockRejectedValue(new Error("Failed to enable"));

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(false);
    });

    await act(async () => {
      await expect(result.current.enableAutostart()).rejects.toThrow("Failed to enable");
    });
    expect(result.current.loading).toBe(false);
  });

  it("should handle disable autostart error", async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockDisable.mockRejectedValue(new Error("Failed to disable"));

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(true);
    });

    await act(async () => {
      await expect(result.current.disableAutostart()).rejects.toThrow("Failed to disable");
    });
    expect(result.current.loading).toBe(false);
  });

  it("should handle toggle autostart error", async () => {
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockRejectedValue(new Error("Failed to enable"));

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(false);
    });

    await act(async () => {
      await expect(result.current.toggleAutostart()).rejects.toThrow("Failed to enable");
    });
  });

  it("should handle isEnabled check error gracefully", async () => {
    mockIsEnabled.mockRejectedValue(new Error("Failed to check"));

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(mockIsEnabled).toHaveBeenCalled();
    });

    expect(result.current.isAutostartEnabled).toBe(false);
  });

  it("should set loading state during enable operation", async () => {
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
    );

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(false);
    });

    act(() => {
      result.current.enableAutostart();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 200 },
    );
  });

  it("should set loading state during disable operation", async () => {
    mockIsEnabled.mockResolvedValue(true);
    mockDisable.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
    );

    const { result } = renderHook(() => useAutostart());

    await waitFor(() => {
      expect(result.current.isAutostartEnabled).toBe(true);
    });

    act(() => {
      result.current.disableAutostart();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 200 },
    );
  });
});
