import { test, expect } from "@playwright/test";
import { seedStorage } from "./fixtures";

// The ranking is backed by TanStack Query + Axios + MSW. These drive the mock
// through its network scenarios (seeded into localStorage) and assert the UI
// reacts: data, empty state, and error state with retry.

test("loads the leaderboard and paginates (normal network)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ranking" }).click();

  const rows = page.locator(".rows li");
  await expect(rows.first()).toBeVisible();
  await expect(rows).toHaveCount(8); // DEFAULT_PAGE_SIZE
  await expect(page.getByText(/Page 1 \//)).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/Page 2 \//)).toBeVisible();
});

test("shows the empty state when the server has no data", async ({ page }) => {
  await seedStorage(page, { "pirate-battle:scenario": "empty" });
  await page.goto("/");
  await page.getByRole("button", { name: "Ranking" }).click();

  await expect(page.getByText(/No scores yet/)).toBeVisible();
});

test("shows an error with a retry when the network is offline", async ({ page }) => {
  await seedStorage(page, { "pirate-battle:scenario": "offline" });
  await page.goto("/");
  await page.getByRole("button", { name: "Ranking" }).click();

  // retry: 2 with backoff, so give it room before the error surfaces
  await expect(page.getByText(/Couldn't load the ranking/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
