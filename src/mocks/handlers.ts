import { http, HttpResponse, delay } from "msw";
import type { MatchRecord } from "../data/contracts";
import { DEFAULT_PAGE_SIZE } from "../data/contracts";
import { listHistory, listRanking, upsertMatch } from "./db";
import {
  readFault,
  readsEmpty,
  scenarioLatency,
  writeFault,
  TIMEOUT_HANG_MS,
  type Fault,
} from "./scenarios";

function pageParam(url: URL, key: string, fallback: number): number {
  const v = Number(url.searchParams.get(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

async function blockRead(fault: Fault): Promise<Response | null> {
  switch (fault.kind) {
    case "connection":
      return HttpResponse.error();
    case "timeout":
      await delay(TIMEOUT_HANG_MS);
      return HttpResponse.error();
    case "http":
      return HttpResponse.json({ message: `HTTP ${fault.status}` }, { status: fault.status });
    case "ok":
    case "commit-timeout":
      return null;
  }
}

export const handlers = [
  http.get("/api/ranking", async ({ request }) => {
    await delay(scenarioLatency());
    const blocked = await blockRead(readFault());
    if (blocked) return blocked;

    const url = new URL(request.url);
    const page = pageParam(url, "page", 1);
    const pageSize = pageParam(url, "pageSize", DEFAULT_PAGE_SIZE);
    if (readsEmpty()) {
      return HttpResponse.json({ items: [], page, pageSize, total: 0 });
    }
    return HttpResponse.json(listRanking(page, pageSize));
  }),

  http.get("/api/history", async ({ request }) => {
    await delay(scenarioLatency());
    const blocked = await blockRead(readFault());
    if (blocked) return blocked;

    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId") ?? "";
    const page = pageParam(url, "page", 1);
    const pageSize = pageParam(url, "pageSize", DEFAULT_PAGE_SIZE);
    if (readsEmpty()) {
      return HttpResponse.json({ items: [], page, pageSize, total: 0 });
    }
    return HttpResponse.json(listHistory(playerId, page, pageSize));
  }),

  http.post("/api/matches", async ({ request }) => {
    await delay(scenarioLatency());
    const fault = writeFault();

    switch (fault.kind) {
      case "connection":
        return HttpResponse.error();
      case "timeout":
        await delay(TIMEOUT_HANG_MS);
        return HttpResponse.error();
      case "http":
        return HttpResponse.json({ message: `HTTP ${fault.status}` }, { status: fault.status });
      case "ok":
      case "commit-timeout":
        break;
    }

    const record = (await request.json()) as MatchRecord;
    const saved = upsertMatch(record);

    if (fault.kind === "commit-timeout") {
      await delay(TIMEOUT_HANG_MS);
      return HttpResponse.error();
    }

    return HttpResponse.json({ record: saved }, { status: 201 });
  }),
];
