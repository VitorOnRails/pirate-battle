import type { Page } from "@playwright/test";
import type { MatchRecord } from "../src/data/contracts";

// Fixed identity + match used by the write-path tests. Reusing the app's own
// MatchRecord type keeps the seed in lock-step with the real contract.
export const E2E_PLAYER = { id: "e2e-captain", name: "E2E Captain" };

export const E2E_RECORD: MatchRecord = {
  id: "e2e-match-1",
  playerId: E2E_PLAYER.id,
  playerName: E2E_PLAYER.name,
  score: 99, // distinctive + beats every fixture, so it is easy to assert on
  durationSec: 42,
  endReason: "time",
  config: { sessionTime: 90, spawnInterval: 3 },
  date: "2026-10-11T12:00:00.000Z",
};

/**
 * Seed localStorage before any app script runs. `addInitScript` executes on every
 * load (including reloads), so the app's modules read these values at import time
 * — this is how we drive the network scenario and pre-load the pending queue
 * without touching production code.
 */
export async function seedStorage(page: Page, entries: Record<string, unknown>) {
  await page.addInitScript((data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      window.localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
  }, entries);
}
