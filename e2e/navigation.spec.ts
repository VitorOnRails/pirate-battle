import { test, expect } from "@playwright/test";

// The whole app is a single-player screen state machine. This asserts every
// screen is reachable from the menu and that each returns to it.
test("navigates between the menu and every screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Pirate Battle" })).toBeVisible();

  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("heading", { name: "Battle Options" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Ranking" }).click();
  await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();

  await page.getByRole("button", { name: "Match History" }).click();
  await expect(page.getByRole("heading", { name: "Match History" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});
