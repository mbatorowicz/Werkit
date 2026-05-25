import { test, expect } from "@playwright/test";

/**
 * E2E testy dla krytycznych flow pracownika.
 * Wymaga działającej bazy danych z seedem i zalogowanego użytkownika.
 */
test.describe("Worker flow", () => {
  test.use({ storageState: ".auth/worker.json" });

  test("wyświetla dashboard sesji", async ({ page }) => {
    await page.goto("/worker");
    await expect(page.locator("[data-testid='session-dashboard']")).toBeVisible();
  });

  test("wyświetla listę zleceń", async ({ page }) => {
    await page.goto("/worker/orders");
    await expect(page.locator("[data-testid='orders-list']")).toBeVisible();
  });

  test("można otworzyć kreator sesji", async ({ page }) => {
    await page.goto("/worker");
    await page.click("[data-testid='start-session-btn']");
    await expect(page.locator("[data-testid='wizard-form']")).toBeVisible();
  });
});
