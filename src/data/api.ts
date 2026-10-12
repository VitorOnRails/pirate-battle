import axios from "axios";
import type { MatchRecord, Page, RankingEntry } from "./contracts";
import { DEFAULT_PAGE_SIZE } from "./contracts";

const api = axios.create({ baseURL: "/api", timeout: 8000 });

export async function fetchRanking(
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Page<RankingEntry>> {
  const { data } = await api.get<Page<RankingEntry>>("/ranking", {
    params: { page, pageSize },
  });
  return data;
}

export async function fetchHistory(
  playerId: string,
  page: number,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Page<MatchRecord>> {
  const { data } = await api.get<Page<MatchRecord>>("/history", {
    params: { playerId, page, pageSize },
  });
  return data;
}

export async function submitMatch(record: MatchRecord): Promise<MatchRecord> {
  const { data } = await api.post<{ record: MatchRecord }>("/matches", record);
  return data.record;
}
