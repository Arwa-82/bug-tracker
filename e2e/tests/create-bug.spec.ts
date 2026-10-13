import { test, expect } from "@playwright/test";
import { login } from "./utils";

test.describe("Create bug", () => {
  test("creates a new bug and it appears on the board", async ({ page }) => {
    await login(page);

    // Pick a team from the Teams list — adjust this name/regex if your
    // seeded team names differ (seed.ts creates Mobile/FinTech/Platform/Growth).
    await page.locator(".card", { hasText: "Mobile Team" }).click();
    await expect(page).toHaveURL(/\/board/);

    await page.getByRole("button", { name: "New bug" }).click();

    const title = `E2E test bug ${Date.now()}`;
    await page.getByPlaceholder("Bug title").fill(title);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText(title)).toBeVisible();
  });
});