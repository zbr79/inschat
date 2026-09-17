import { expect, test } from "@playwright/test";

test.use({
  storageState: { cookies: [], origins: [] },
});

test.describe("first-visit guest welcome on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("inschat_ui_lang", "en");
    });
  });

  test("shows welcome selections instead of a dialog", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "What can I help with?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /I’m here to chat/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /I’m here to record blood sugar/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /I’m here to view this work/ })
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveCount(0);
  });

  test("review path loads sample records on a phone", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /I’m here to view this work/ }).click();

    await expect(page).toHaveURL(/\/records$/);
    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sample records are loaded" })).toBeVisible();
  });
});
