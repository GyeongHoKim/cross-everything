import { useAutostart } from "../hooks/useAutostart";

interface SettingsProps {
  onClose?: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { isAutostartEnabled, toggleAutostart, loading } = useAutostart();

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        {onClose && (
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        )}
      </div>
      <div className="settings-content">
        <div className="settings-item">
          <div className="settings-label">
            <span>Start at Login</span>
            <span className="settings-description">
              Automatically start CrossEverything when you log in
            </span>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={isAutostartEnabled}
              onChange={toggleAutostart}
              disabled={loading}
              aria-label="Enable start at login"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
