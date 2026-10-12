import { test, expect } from "@playwright/test";
import { seedStorage, E2E_PLAYER, E2E_RECORD } from "./fixtures";

// The write path, end to end through the real data layer. A finished match is
// first queued in the `pending` store, then submitted; `useRetryPending` flushes
// that queue on load. We seed one pending record and assert it reaches the
// server (MSW) and shows up in the player's history — and that resubmitting the
// same record (idempotency key = record.id) never creates a duplicate.

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    "pirate-battle:player": E2E_PLAYER,
    "pirate-battle:pending": [E2E_RECORD],
  });
});

test("flushes a pending match to the server and shows it in history", async ({ page }) => {
  await page.goto("/"); // useRetryPending submits the queued record on mount
  await page.getByRole("button", { name: "Match History" }).click();

  const rows = page.locator(".rows li");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("99");
  await expect(rows.first()).toContainText("Survived");
});

test("resubmitting the same match is idempotent (no duplicate)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Match History" }).click();
  await expect(page.locator(".rows li")).toHaveCount(1);

  // Reload: the init script re-seeds the pending queue, so the SAME record id is
  // submitted a second time. The server upserts by id, so history stays at one.
  await page.reload();
  await page.getByRole("button", { name: "Match History" }).click();
  await expect(page.locator(".rows li")).toHaveCount(1);
});

test("commit-then-timeout records the match exactly once", async ({ page }) => {
  // The server persists the record and only then the reply times out, so the
  // client never hears success and keeps retrying. Reads are unaffected, so the
  // history shows the single committed row — and a reload (another timed-out
  // retry of the same id) leaves it at one.
  await page.addInitScript(() =>
    window.localStorage.setItem("pirate-battle:scenario", "submit-timeout"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Match History" }).click();
  await expect(page.locator(".rows li")).toHaveCount(1);

  await page.reload();
  await page.getByRole("button", { name: "Match History" }).click();
  await expect(page.locator(".rows li")).toHaveCount(1);
});
