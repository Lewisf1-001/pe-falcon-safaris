import { test, expect } from "@playwright/test";

test.describe("Admin Security & Authorization E2E", () => {
  test("redirects unauthenticated users attempting to access client protected profile route", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/login|signin|auth/i);
  });
});
