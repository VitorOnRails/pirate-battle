import { test, expect } from "@playwright/test";

// Exercises the PixiJS engine through its React lifecycle: assets load, the
// canvas mounts, the HUD reflects state, and pause/resume + exit work. We don't
// wait out a full match — just the mount + control surface the engine exposes.
test("starts a match, pauses, resumes, and exits to the menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();

  // The canvas mounts once assets finish loading and the engine is initialised.
  await expect(page.locator(".game-canvas canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeHidden();

  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Main Menu" }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});
