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

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
          />
          Reduce motion
        </label>
        <p className="setting-hint">Disables animations and transitions. WCAG 2.1 AAA.</p>
      </section>

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.focusMode}
            onChange={(e) => updateSettings({ focusMode: e.target.checked })}
          />
          Focus mode (Daily screen)
        </label>
        <p className="setting-hint">Hides header, nav, and helper on Daily — just your Top 3 tasks.</p>
      </section>

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => updateSettings({ darkMode: e.target.checked })}
          />
          Dark mode
        </label>
        <p className="setting-hint">Dark theme for reduced eye strain.</p>
      </section>

      <section className="settings-section">
        <label>Sensory-friendly theme</label>
        <select
          value={settings.sensoryTheme}
          onChange={(e) => updateSettings({ sensoryTheme: e.target.value as 'calm' | 'focus' | 'warm' })}
        >
          <option value="calm">Calm</option>
          <option value="focus">Focus</option>
          <option value="warm">Warm</option>
        </select>
        <p className="setting-hint">Switches the app palette to match the kind of energy you want from the interface.</p>
      </section>

      <section className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={settings.celebrationsEnabled}
            onChange={(e) => updateSettings({ celebrationsEnabled: e.target.checked })}
          />
          Gentle celebration moments
        </label>
        <p className="setting-hint">Opt in to subtle “nice work” feedback when you finish tasks. Automatically stays calmer with reduce motion.</p>
      </section>
    </div>
  );
}
