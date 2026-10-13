import { test, expect } from "@playwright/test";

const TEST_EMAIL = "mobile-admin@example.com";
const TEST_PASSWORD = "password123";

test.describe("Login", () => {
  test("logs in with valid credentials and lands on the Teams page", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await expect(page).toHaveURL(/\/teams/);
  });

  test("shows an error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});