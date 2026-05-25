import { test, expect } from "@playwright/test";

/**
 * E2E testy dla flow logowania.
 * Wymaga działającej bazy danych z seedem.
 */
test.describe("Auth flow", () => {
  test("wyświetla stronę logowania", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2, [data-testid='login-title']")).toBeVisible();
  });

  test("przekierowuje niezalogowanego użytkownika na login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("pokazuje błąd przy pustym haśle", async ({ page }) => {
    await page.goto("/login");
    await page.fill("[name='username']", "admin");
    await page.fill("[name='password']", "");
    await page.click("[type='submit']");
    await expect(page.locator("text=wymagane")).toBeVisible();
  });
});
