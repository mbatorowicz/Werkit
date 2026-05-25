import { test, expect } from "@playwright/test";

/**
 * E2E testy dla krytycznych flow admina.
 * Wymaga działającej bazy danych z seedem i zalogowanego admina.
 */
test.describe("Admin flow", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("wyświetla panel admina", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("[data-testid='admin-dashboard']")).toBeVisible();
  });

  test("wyświetla listę zleceń", async ({ page }) => {
    await page.goto("/admin/work-orders");
    await expect(page.locator("[data-testid='work-orders-list']")).toBeVisible();
  });

  test("wyświetla listę użytkowników", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("[data-testid='users-list']")).toBeVisible();
  });
});
