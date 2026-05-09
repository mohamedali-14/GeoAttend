import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto(BASE + "/login");
    await expect(page).toHaveTitle(/GeoAttend/);
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.getByPlaceholder(/email/i).fill("wrong@test.com");
    await page.getByPlaceholder(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Should show error or stay on login
    await expect(page).toHaveURL(/login/);
  });

  test("student login redirects to student dashboard", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.getByPlaceholder(/email/i).fill("student@test.com");
    await page.getByPlaceholder(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/student/, { timeout: 8000 });
  });

  test("unauthenticated user redirected from protected route", async ({ page }) => {
    await page.goto(BASE + "/student");
    await expect(page).toHaveURL(/login/);
  });
});
