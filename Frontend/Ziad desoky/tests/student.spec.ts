import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

// Reusable login function
async function loginAsStudent(page: any) {
  await page.goto(BASE + "/login");
  await page.getByPlaceholder(/email/i).fill("student@test.com");
  await page.getByPlaceholder(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/student/, { timeout: 8000 });
}

test.describe("Student Dashboard", () => {
  test("shows welcome message and stats", async ({ page }) => {
    await loginAsStudent(page);
    await expect(page.getByText(/welcome/i)).toBeVisible();
    await expect(page.getByText(/enrolled/i)).toBeVisible();
  });

  test("attendance tab loads", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /attendance/i }).click();
    await expect(page.getByText(/history/i)).toBeVisible({ timeout: 5000 });
  });

  test("stats tab shows charts", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /stats|progress/i }).click();
    await expect(page.getByText(/attendance/i)).toBeVisible({ timeout: 5000 });
  });
});
