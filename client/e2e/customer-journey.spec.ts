import { test, expect } from "@playwright/test";

test.describe("Public Customer Journey E2E", () => {
  test("loads homepage successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PE Falcon Safaris/i);
    await expect(page.locator("h1")).toContainText("Explore Kenya");
  });

  test("navigates to packages page", async ({ page }) => {
    await page.goto("/packages");
    await expect(page).toHaveURL(/packages/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("loads login page successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("form").first()).toBeVisible();
  });
});
