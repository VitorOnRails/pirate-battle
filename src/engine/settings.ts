import { config } from "./config";

export interface MatchSettings {
  sessionTime: number;
  spawnInterval: number;
}

export const SETTINGS_BOUNDS = {
  sessionTime: { min: 60, max: 180 },
  spawnInterval: { min: 1, max: 10 },
} as const;

export const DEFAULT_SETTINGS: MatchSettings = {
  sessionTime: config.match.duration,
  spawnInterval: config.spawn.interval,
};

const STORAGE_KEY = "pirate-battle:settings";

export function clampSettings(s: MatchSettings): MatchSettings {
  const fix = (v: number, b: { min: number; max: number }, def: number) =>
    Number.isFinite(v) ? Math.min(b.max, Math.max(b.min, Math.round(v))) : def;
  return {
    sessionTime: fix(s.sessionTime, SETTINGS_BOUNDS.sessionTime, DEFAULT_SETTINGS.sessionTime),
    spawnInterval: fix(s.spawnInterval, SETTINGS_BOUNDS.spawnInterval, DEFAULT_SETTINGS.spawnInterval),
  };
}

export function loadSettings(): MatchSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MatchSettings>;
    return clampSettings({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: MatchSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}
