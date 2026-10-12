import { test, expect } from "@playwright/test";

// Visual-regression baseline for the main menu (a static, animation-free screen,
// so the snapshot is stable). Run `npm run test:e2e -- --update-snapshots` to
// refresh the baseline after an intentional visual change.
test("menu matches its visual snapshot", async ({ page }) => {
  await page.goto("/");

  const title = page.getByRole("img", { name: "Pirate Battle" });
  await expect(title).toBeVisible();
  // Wait for the title image to fully decode so the snapshot is deterministic.
  await title.evaluate(
    (el: HTMLImageElement) =>
      el.complete || new Promise((resolve) => el.addEventListener("load", () => resolve(null))),
  );

  await expect(page.locator(".menu-panel")).toHaveScreenshot("menu-panel.png", {
    maxDiffPixelRatio: 0.02,
  });
});
