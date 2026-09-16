import { expect, test } from "@playwright/test";

test.describe("guest phone UI", () => {
  test("opens the mobile drawer and reaches records", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Records" })).toBeVisible();

    await page.getByRole("link", { name: "Records" }).click();
    await expect(page).toHaveURL(/\/records$/);
  });

  test("keeps the composer controls usable on a phone", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Attach file" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voice input" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  test("keeps delete controls hidden until phone edit mode", async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem(
        "inschat_guest_sessions",
        JSON.stringify([
          {
            id: "mobile-edit-report",
            title: "Mobile edit test",
            updatedAt: now,
            chatMode: "health",
            messages: [
              {
                id: "mobile-edit-message",
                role: "user",
                text: "Phone edit mode test",
                status: "complete",
                createdAt: now,
                updatedAt: now,
              },
            ],
            conclusion: {
              title: "Mobile edit test",
              summary: "Saved report for the phone edit-mode test.",
              items: [{ name: "Glucose", value: "110", unit: "mg/dL" }],
              imageKeys: ["mobile-meal-image"],
              meals: [
                {
                  name: "Dinner",
                  time: "2026-09-15T19:00:00",
                  dishes: [{ name: "Rice", rank: "High" }],
                },
              ],
              events: [
                {
                  id: "mobile-meal-event",
                  occurredAt: "2026-09-15T19:00:00",
                  items: [],
                  meals: [
                    {
                      name: "Dinner",
                      time: "2026-09-15T19:00:00",
                      dishes: [{ name: "Rice", rank: "High" }],
                    },
                  ],
                  imageKeys: ["mobile-meal-image"],
                },
              ],
            },
          },
        ])
      );
    });
    await page.goto("/?session=mobile-edit-report");
    await page
      .getByRole("button", { name: "Summarize this conversation" })
      .click();

    const remove = page.locator(".conclude-reading-label > .conclude-card-remove");
    await expect(remove).toHaveCount(1);
    await expect(remove).toBeHidden();
    await expect(page.locator(".conclude-mobile-edit-toggle")).not.toBeFocused();
    const layout = await page.locator(".conclude-catalog-head").evaluate((head) => {
      const box = (selector: string) => {
        const rect = head.querySelector(selector)?.getBoundingClientRect();
        return rect
          ? {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
            }
          : null;
      };
      return {
        name: box(".conclude-glucose-label"),
        phase: box(".conclude-inline-phase"),
        value: box(".conclude-inline-reading-value"),
        number: box(".conclude-inline-value"),
        unit: box(".conclude-inline-unit"),
      };
    });
    expect(Math.abs((layout.name?.top ?? 0) - (layout.phase?.top ?? 0))).toBeLessThanOrEqual(10);
    expect(layout.value?.top).toBeGreaterThanOrEqual(
      Math.max(layout.name?.bottom ?? 0, layout.phase?.bottom ?? 0)
    );
    expect(layout.number?.top).toBe(layout.value?.top);
    expect(Math.abs((layout.unit?.top ?? 0) - (layout.value?.top ?? 0))).toBeLessThanOrEqual(4);
    expect(layout.number?.left).toBeLessThanOrEqual(layout.unit?.left ?? 0);
    expect(layout.unit?.right).toBeGreaterThanOrEqual((layout.value?.right ?? 0) - 1);
    const timestampAlignment = await page
      .locator(".conclude-meal-head, .conclude-catalog-head")
      .evaluateAll((heads) =>
        heads.map((head) => {
          const headRight = head.getBoundingClientRect().right;
          const time = head.querySelector(
            ".conclude-inline-meal-time, .conclude-inline-time"
          );
          return time
            ? time.getBoundingClientRect().right >= headRight - 1
            : false;
        })
      );
    expect(timestampAlignment.every(Boolean)).toBe(true);
    const timestampPenOrders = await page
      .locator(".conclude-inline-meal-time, .conclude-inline-time")
      .evaluateAll((times) =>
        times.map((time) => {
          const pen = time.querySelector(".edit-pen");
          return pen ? getComputedStyle(pen).order : null;
        })
      );
    expect(timestampPenOrders.every((order) => order === "-1")).toBe(true);
    await expect(page.locator(".conclude-inline-unit .edit-pen")).toHaveCSS("order", "-1");
    await expect(page.locator(".conclude-inline-dish-name")).toHaveCSS("font-size", "14px");
    await expect(page.locator(".conclude-inline-value")).toHaveCSS("font-size", "14px");
    await expect(page.locator(".conclude-rank-badge")).toHaveCSS("font-size", "12px");
    const mealImage = page.locator(".conclude-meal-title .record-images-trigger");
    await expect(mealImage).toBeVisible();
    await expect(mealImage.locator("svg")).toHaveCSS("width", "17px");
    await mealImage.hover();
    await expect(mealImage).toHaveCSS("outline-style", "none");
    const mealIconAlignment = await mealImage.evaluate((icon) => {
      const name = icon.parentElement?.querySelector(".conclude-inline-meal-name");
      if (!name) return false;
      const iconBox = icon.getBoundingClientRect();
      const nameBox = name.getBoundingClientRect();
      return Math.abs(iconBox.top + iconBox.height / 2 - (nameBox.top + nameBox.height / 2)) <= 2;
    });
    expect(mealIconAlignment).toBe(true);
    const rankRight = await page.locator(".conclude-rank-badge").evaluate((rank) => {
      const row = rank.closest(".conclude-dish-row");
      return row
        ? rank.getBoundingClientRect().right >= row.getBoundingClientRect().right - 1
        : false;
    });
    expect(rankRight).toBe(true);

    const editToggle = page.locator(".conclude-mobile-edit-toggle");
    await expect(editToggle).toHaveText("Edit");
    await editToggle.click();
    await expect(editToggle).toHaveText("Done");
    await expect(remove).toBeVisible();

    await editToggle.click();
    await expect(remove).toBeHidden();
  });
});
