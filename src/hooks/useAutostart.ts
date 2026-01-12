import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useCallback, useEffect, useState } from "react";

interface UseAutostartReturn {
  isAutostartEnabled: boolean;
  enableAutostart: () => Promise<void>;
  disableAutostart: () => Promise<void>;
  toggleAutostart: () => Promise<void>;
  loading: boolean;
}

export function useAutostart(): UseAutostartReturn {
  const [isAutostartEnabled, setIsAutostartEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkAutostartStatus = useCallback(async () => {
    try {
      const enabled = await isEnabled();
      setIsAutostartEnabled(enabled);
    } catch (err) {
      console.error("Failed to check autostart status:", err);
    }
  }, []);

  const enableAutostartFn = useCallback(async () => {
    setLoading(true);
    try {
      await enable();
      setIsAutostartEnabled(true);
    } catch (err) {
      console.error("Failed to enable autostart:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disableAutostartFn = useCallback(async () => {
    setLoading(true);
    try {
      await disable();
      setIsAutostartEnabled(false);
    } catch (err) {
      console.error("Failed to disable autostart:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAutostart = useCallback(async () => {
    if (isAutostartEnabled) {
      await disableAutostartFn();
    } else {
      await enableAutostartFn();
    }
  }, [isAutostartEnabled, enableAutostartFn, disableAutostartFn]);

  // Check status on mount
  useEffect(() => {
    checkAutostartStatus();
  }, [checkAutostartStatus]);

  return {
    isAutostartEnabled,
    enableAutostart: enableAutostartFn,
    disableAutostart: disableAutostartFn,
    toggleAutostart,
    loading,
  };
}
