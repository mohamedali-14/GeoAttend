import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

async function loginAsDoctor(page: any) {
  await page.goto(BASE + "/login");
  await page.getByPlaceholder(/email/i).fill("doctor@test.com");
  await page.getByPlaceholder(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/doctor/, { timeout: 8000 });
}

test.describe("Doctor Dashboard", () => {
  test("doctor dashboard loads", async ({ page }) => {
    await loginAsDoctor(page);
    await expect(page.getByText(/doctor|professor/i)).toBeVisible();
  });

  test("attendance report tab exists", async ({ page }) => {
    await loginAsDoctor(page);
    await page.getByRole("button", { name: /attendance report/i }).click();
    await expect(page.getByText(/sessions|records/i)).toBeVisible({ timeout: 5000 });
  });

  test("quiz panel loads", async ({ page }) => {
    await loginAsDoctor(page);
    await page.getByRole("button", { name: /quiz/i }).click();
    await expect(page.getByText(/quiz/i)).toBeVisible({ timeout: 5000 });
  });
});
