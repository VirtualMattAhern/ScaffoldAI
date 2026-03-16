import { useSettings } from '../contexts/SettingsContext';
import './Screen.css';

export function Settings() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="screen">
      <h1>Settings</h1>
      <p className="subtitle">Customize your experience. Changes apply immediately.</p>

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => updateSettings({ highContrast: e.target.checked })}
          />
          High contrast mode
        </label>
        <p className="setting-hint">Increases contrast for better visibility. Meets WCAG AA.</p>
      </section>

      <section className="settings-section">
        <label>Font size</label>
        <select
          value={settings.fontSizePercent}
          onChange={(e) => updateSettings({ fontSizePercent: Number(e.target.value) })}
        >
          <option value={90}>90%</option>
          <option value={100}>100%</option>
          <option value={110}>110%</option>
          <option value={125}>125%</option>
        </select>
      </section>

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.dyslexiaFont}
            onChange={(e) => updateSettings({ dyslexiaFont: e.target.checked })}
          />
          Dyslexia-friendly font
        </label>
        <p className="setting-hint">Uses OpenDyslexic when available for easier reading.</p>
      </section>
    </div>
  );
}
