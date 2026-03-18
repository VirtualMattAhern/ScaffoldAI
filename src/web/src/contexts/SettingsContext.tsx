import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';

type Settings = {
  highContrast: boolean;
  fontSizePercent: number;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  focusMode: boolean;
  darkMode: boolean;
};

const defaultSettings: Settings = {
  highContrast: false,
  fontSizePercent: 100,
  dyslexiaFont: false,
  reduceMotion: false,
  focusMode: false,
  darkMode: false,
};

const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(() => {});
  }, []);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      api.settings.update(updates).catch(() => {});
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
