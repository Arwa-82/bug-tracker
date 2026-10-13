import { Page } from "@playwright/test";

const TEST_EMAIL = "mobile-admin@example.com";
const TEST_PASSWORD = "password123";

// Logs in as the seeded admin user and waits for the redirect to /teams.
// Shared across spec files so each one doesn't repeat the same login steps.
export async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/teams/);
}