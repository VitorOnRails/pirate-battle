import type { MatchRecord } from "./contracts";

const STORAGE_KEY = "pirate-battle:pending";

export function getPending(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function save(list: MatchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function addPending(record: MatchRecord): void {
  const list = getPending().filter((r) => r.id !== record.id);
  list.push(record);
  save(list);
}

export function removePending(id: string): void {
  save(getPending().filter((r) => r.id !== id));
}

export function clearPending(): void {
  save([]);
}
