import { test, expect } from "@playwright/test";
import { login } from "./utils";

test.describe("Bug status workflow", () => {
  test("moves a bug from Open to In Progress via the board", async ({ page }) => {
    await login(page);

    await page.locator(".card", { hasText: "Mobile Team" }).click();
    await expect(page).toHaveURL(/\/board/);

    await page.getByRole("button", { name: "New bug" }).click();
    const title = `E2E workflow bug ${Date.now()}`;
    await page.getByPlaceholder("Bug title").fill(title);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(title)).toBeVisible();

    const card = page.locator(".card", { hasText: title });

    // A fresh bug starts "open", whose only valid next status is
    // "in_progress" — select it from the card's "Move to..." dropdown.
    await card.getByRole("combobox").selectOption("in_progress");

    // No error banner means the backend accepted the transition.
    await expect(page.getByText(/cannot move a bug/i)).not.toBeVisible();

    // Once moved to "in_progress", the valid next transitions are "fixed"
    // or back to "open" — confirming the card's dropdown now reflects the
    // new status.
    await expect(card.getByRole("option", { name: "fixed" })).toBeAttached();
  });
});