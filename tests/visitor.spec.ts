import { expect, test } from "@playwright/test";

test.use({
  storageState: { cookies: [], origins: [] },
});

test.describe("guest Health intro", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("inschat_ui_lang", "en");
    });
  });

  test("home opens the normal composer without a visitor chooser", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /I’m here to/ })).toHaveCount(0);
  });

  test("shows the Health intro only on the first Health send", async ({ page }) => {
    await page.goto("/?newMode=health", { waitUntil: "domcontentloaded" });

    const modal = page.getByRole("dialog", { name: "Sample data inserted" });
    const message = page.getByRole("textbox", { name: "Message" });
    await expect(modal).toHaveCount(0);
    await message.fill("Show me how to record a reading");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(modal).toBeVisible();
    await expect(message).toHaveValue("Show me how to record a reading");
    await expect(
      modal.getByText("30 days of sample data inserted for quick viewing.")
    ).toBeVisible();
    await expect(modal.locator("button").nth(0)).toHaveText("Clear data");

    await modal.getByRole("button", { name: "Clear data" }).click();
    await expect(modal).toHaveCount(0);
    await expect(message).toHaveValue("Show me how to record a reading");
  });

  test("preloads example records for a guest", async ({ page }) => {
    await page.goto("/records", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByText("Example data", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Sample Data" })).toBeEnabled();
  });

  test("can clear example data from the first Health send", async ({ page }) => {
    await page.goto("/?newMode=health", { waitUntil: "domcontentloaded" });

    const modal = page.getByRole("dialog", { name: "Sample data inserted" });
    await page.getByRole("textbox", { name: "Message" }).fill("Start with a clean record");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Clear data" }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator(".input-row.mode-health")).toBeVisible();
    await page.getByRole("button", { name: "Send" }).click();
    await expect(modal).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog", { name: "Sample data inserted" })).toHaveCount(0);
    await page.getByRole("textbox", { name: "Message" }).fill("Show the intro again");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("dialog", { name: "Sample data inserted" })).toBeVisible();
  });

  test("can view example records from the first Health send", async ({ page }) => {
    await page.goto("/?newMode=health", { waitUntil: "domcontentloaded" });

    const modal = page.getByRole("dialog", { name: "Sample data inserted" });
    await page.getByRole("textbox", { name: "Message" }).fill("I want to understand the sample data");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "View records" }).click();

    await expect(page).toHaveURL(/\/records$/);
    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByText("Example data", { exact: true })).toHaveCount(0);
  });
});
