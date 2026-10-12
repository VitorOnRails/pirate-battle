const BASE_URL = "/assets/sounds";

const SFX = {
  cannon_fire_1: "cannon_fire_1.wav",
  cannon_fire_2: "cannon_fire_2.wav",
  cannon_fire_3: "cannon_fire_3.wav",
  cannon_broadside: "cannon_broadside.wav",
  ship_explosion_1: "ship_explosion_1.wav",
  ship_explosion_2: "ship_explosion_2.wav",
  ship_wood_hit_1: "ship_wood_hit_1.wav",
  ship_wood_hit_2: "ship_wood_hit_2.wav",
  ship_collision: "ship_collision.wav",
  game_start: "game_start.wav",
  game_over: "game_over.wav",
  game_complete: "game_complete.wav",
  game_pause: "game_pause.wav",
  game_resume: "game_resume.wav",
  ui_click: "ui_click.wav",
} as const;

export type SfxName = keyof typeof SFX;

const STORAGE_KEY = "pirate-battle:audio";
const AMBIENCE_MIX = 0.35;

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

function load(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AudioSettings>;
      return { muted: Boolean(s.muted), volume: clamp01(s.volume ?? 0.7) };
    }
  } catch {}
  return { muted: false, volume: 0.7 };
}

let settings: AudioSettings = load();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

const bases = new Map<SfxName, HTMLAudioElement>();

function base(name: SfxName): HTMLAudioElement {
  let el = bases.get(name);
  if (!el) {
    el = new Audio(`${BASE_URL}/${SFX[name]}`);
    el.preload = "auto";
    bases.set(name, el);
  }
  return el;
}

export function playSfx(name: SfxName, volumeScale = 1): void {
  if (settings.muted || settings.volume <= 0) return;
  const node = base(name).cloneNode() as HTMLAudioElement;
  node.volume = clamp01(settings.volume * volumeScale);
  void node.play().catch(() => {
  });
}

export function playRandomSfx(names: SfxName[]): void {
  playSfx(names[Math.floor(Math.random() * names.length)]);
}

let ambience: HTMLAudioElement | null = null;
let ambienceOn = false;

export function startAmbience(): void {
  ambienceOn = true;
  if (settings.muted) return;
  if (!ambience) {
    ambience = new Audio(`${BASE_URL}/ocean_ambience_loop.wav`);
    ambience.loop = true;
  }
  ambience.volume = clamp01(settings.volume * AMBIENCE_MIX);
  void ambience.play().catch(() => {});
}

export function stopAmbience(): void {
  ambienceOn = false;
  if (ambience) {
    ambience.pause();
    ambience.currentTime = 0;
  }
}

export function getAudioSettings(): AudioSettings {
  return { ...settings };
}

export function setMuted(muted: boolean): void {
  settings = { ...settings, muted };
  persist();
  if (muted) ambience?.pause();
  else if (ambienceOn) startAmbience();
}

export function setVolume(volume: number): void {
  settings = { ...settings, volume: clamp01(volume) };
  persist();
  if (ambience) ambience.volume = clamp01(settings.volume * AMBIENCE_MIX);
}

let uiInit = false;

export function initUiClickSound(): void {
  if (uiInit) return;
  uiInit = true;
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("button.btn, button.btn-mini")) playSfx("ui_click", 0.8);
  });
}
