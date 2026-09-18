import { expect, test } from "@playwright/test";

test.use({
  storageState: { cookies: [], origins: [] },
});

test.describe("guest Health intro on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("inschat_ui_lang", "en");
    });
  });

  test("opens the normal composer without a visitor chooser", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("shows the Health intro on the first Health send", async ({ page }) => {
    await page.goto("/?newMode=health", { waitUntil: "domcontentloaded" });

    const modal = page.getByRole("dialog", { name: "Sample data inserted" });
    await page.getByRole("textbox", { name: "Message" }).fill("Show my health records");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(modal).toBeVisible();
  });
});
