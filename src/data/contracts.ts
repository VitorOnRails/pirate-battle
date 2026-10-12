export type EndReason = "time" | "death";

export interface MatchConfig {
  sessionTime: number;
  spawnInterval: number;
}

export interface MatchRecord {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  durationSec: number;
  endReason: EndReason;
  config: MatchConfig;
  date: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RankingEntry {
  rank: number;
  matchId: string;
  playerId: string;
  playerName: string;
  score: number;
  date: string;
}

export const DEFAULT_PAGE_SIZE = 8;
