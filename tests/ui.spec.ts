import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/records",
  "/records/full",
  "/calls",
  "/models",
  "/opencode",
  "/opencode-calls",
  "/login",
  "/signup",
];

test.describe("public UI routes", () => {
  for (const route of publicRoutes) {
    test(`${route} renders without an application error`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveTitle(/InsChat/i);
      await expect(page.locator(".main")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    });
  }
});

test.describe("guest desktop UI", () => {
  test("home exposes the composer, navigation, and settings", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Attach file" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voice input" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Records" })).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    const settings = page.getByRole("dialog");
    await expect(settings).toBeVisible();
    await expect(settings).toContainText("Settings");
    await settings.getByRole("button", { name: "Cancel" }).click();
    await expect(settings).toBeHidden();
  });

  test("guest can navigate to records from the sidebar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Records" }).click();

    await expect(page).toHaveURL(/\/records$/);
    await expect(page.locator(".main")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("guest can open a saved session report without another request", async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem(
        "inschat_guest_sessions",
        JSON.stringify([
          {
            id: "e2e-report",
            title: "UI test report",
            updatedAt: now,
            chatMode: "health",
            messages: [
              {
                id: "e2e-message",
                role: "user",
                text: "UI test message",
                status: "complete",
                createdAt: now,
                updatedAt: now,
              },
            ],
            conclusion: {
              title: "UI test report",
              summary: "A saved report used only by the isolated browser test.",
              items: [{ name: "Glucose", value: "110", unit: "mg/dL" }],
              meals: [
                {
                  name: "Dinner",
                  time: "2026-09-15T19:00:00",
                  dishes: [{ name: "Rice", rank: "High" }],
                },
              ],
            },
          },
        ])
      );
    });
    await page.goto("/?session=e2e-report");

    const reportButton = page.getByRole("button", {
      name: "Summarize this conversation",
    });
    await expect(reportButton).toBeEnabled();
    await reportButton.click();

    await expect(page.getByRole("heading", { name: "Conclusion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "110" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove dish" })).toHaveCount(3);
  });

  test("guest usage route returns to chat instead of exposing private usage", async ({
    page,
  }) => {
    await page.goto("/usage");
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  });
});
