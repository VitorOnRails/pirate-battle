const STORAGE_KEY = "pirate-battle:player";

const ADJECTIVES = ["Sunny", "Salty", "Fierce", "Jolly", "Iron", "Crimson", "Storm", "Golden"];
const ANIMALS = ["Seal", "Kraken", "Marlin", "Gull", "Shark", "Otter", "Orca", "Crab"];

export interface Player {
  id: string;
  name: string;
}

function randomId(): string {
  return crypto.randomUUID();
}

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${a} ${n} ${Math.floor(Math.random() * 90) + 10}`;
}

export function makeGuestName(): string {
  return randomName();
}

let cached: Player | null = null;

export function getPlayer(): Player {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Player;
      if (p.id && p.name) {
        cached = p;
        return p;
      }
    }
  } catch {}
  const player: Player = { id: randomId(), name: randomName() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {}
  cached = player;
  return player;
}

export function setPlayerName(name: string): void {
  const updated: Player = { ...getPlayer(), name };
  cached = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
