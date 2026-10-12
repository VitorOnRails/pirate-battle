import type { MatchRecord, Page, RankingEntry } from "../data/contracts";

const STORAGE_KEY = "pirate-battle:records";

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJ = ["Sunny", "Salty", "Fierce", "Jolly", "Iron", "Crimson", "Storm", "Golden", "Black", "Mad"];
const ANI = ["Seal", "Kraken", "Marlin", "Gull", "Shark", "Otter", "Orca", "Crab", "Eel", "Ray"];

function makeFixtures(): MatchRecord[] {
  const rng = mulberry32(1337);
  const out: MatchRecord[] = [];
  for (let i = 0; i < 40; i++) {
    const name = `${ADJ[Math.floor(rng() * ADJ.length)]} ${ANI[Math.floor(rng() * ANI.length)]} ${10 + Math.floor(rng() * 90)}`;
    const daysAgo = Math.floor(rng() * 30);
    out.push({
      id: `seed-${i}`,
      playerId: `seed-player-${i}`,
      playerName: name,
      score: Math.floor(rng() * 40),
      durationSec: 60 + Math.floor(rng() * 120),
      endReason: rng() < 0.5 ? "time" : "death",
      config: { sessionTime: 90, spawnInterval: 3 },
      date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
  }
  return out;
}

const fixtures = makeFixtures();
let confirmed: MatchRecord[] = loadConfirmed();

function loadConfirmed(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(confirmed));
  } catch {}
}

function all(): MatchRecord[] {
  return [...fixtures, ...confirmed];
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

function byRanking(a: MatchRecord, b: MatchRecord): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

export function listRanking(page: number, pageSize: number): Page<RankingEntry> {
  const sorted = all().sort(byRanking);
  const entries: RankingEntry[] = sorted.map((r, i) => ({
    rank: i + 1,
    matchId: r.id,
    playerId: r.playerId,
    playerName: r.playerName,
    score: r.score,
    date: r.date,
  }));
  return paginate(entries, page, pageSize);
}

export function listHistory(playerId: string, page: number, pageSize: number): Page<MatchRecord> {
  const mine = all()
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return paginate(mine, page, pageSize);
}

export function upsertMatch(record: MatchRecord): MatchRecord {
  const idx = confirmed.findIndex((r) => r.id === record.id);
  if (idx >= 0) confirmed[idx] = record;
  else confirmed.push(record);
  persist();
  return record;
}

export function clearConfirmed(): void {
  confirmed = [];
  persist();
}
