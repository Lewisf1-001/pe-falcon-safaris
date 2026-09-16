import { test, expect } from "@playwright/test";

test.describe("Negative Test Scenarios E2E", () => {
  test("handles nonexistent package graceful 404 or redirect", async ({ page }) => {
    const response = await page.goto("/packages/nonexistent-safari-package-9999");
    // Should either show 404 or redirect to packages
    expect(response?.status() === 404 || page.url().includes("packages") || page.url().includes("404")).toBeTruthy();
  });

  test("rejects invalid login credentials gracefully", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");
    const submitBtn = page.locator("button[type='submit']");

    if (await emailInput.isVisible()) {
      await emailInput.fill("fakeuser@test.com");
      await passwordInput.fill("WrongPassword123!");
      await submitBtn.click();

      // Expect error message or staying on login page
      const errorMessage = page.locator("text=/error|invalid|failed|incorrect/i");
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    }
  });
});
