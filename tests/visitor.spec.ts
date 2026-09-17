import { expect, test } from "@playwright/test";

test.use({
  storageState: { cookies: [], origins: [] },
});

test.describe("first-visit guest welcome", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("inschat_ui_lang", "en");
    });
  });

  test("home is a welcome page with three selections", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "What can I help with?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /I’m here to chat/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /I’m here to record blood sugar/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /I’m here to view this work/ })
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("chat path opens the general composer", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /I’m here to chat/ }).click();

    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: /I’m here to chat/ })).toHaveCount(0);
    await expect(page).toHaveURL(/newMode=general/);
  });

  test("blood-sugar path starts a health chat", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /I’m here to record blood sugar/ }).click();

    await expect(page).toHaveURL(/newMode=health/);
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.locator(".input-row.mode-health")).toBeVisible();
  });

  test("review path loads sample records and a tour", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /I’m here to view this work/ }).click();

    await expect(page).toHaveURL(/\/records$/);
    await expect(page.getByRole("heading", { name: "Records", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove example data" })).toBeEnabled();

    const coach = page.getByRole("region", { name: "Sample records are loaded" });
    await expect(coach).toBeVisible();
    await expect(coach.getByRole("button", { name: "Try a health chat" })).toBeVisible();
    await coach.getByRole("button", { name: "Got it" }).click();
    await expect(coach).toHaveCount(0);
  });

  test("does not ask again after a path is chosen", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /I’m here to chat/ }).click();
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /I’m here to chat/ })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  });
});
