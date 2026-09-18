import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  openGuestRecords,
} from "./recordsHelpers";

test.describe("guest records page on a phone", () => {
  test("keeps auto-loaded records usable without sideways scroll", async ({
    page,
  }) => {
    await openGuestRecords(page);

    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load example data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Sample Data" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Time range" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const rangeBox = await page.locator(".records-range-select").boundingBox();
    expect(rangeBox).toBeTruthy();
    expect(rangeBox!.height).toBeGreaterThanOrEqual(36);
    const header = await page.evaluate(() => {
      const box = (el: Element | null) => {
        const rect = el?.getBoundingClientRect();
        return rect
          ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
          : null;
      };
      return {
        title: box(document.querySelector(".records-page-title h2")),
        range: box(document.querySelector(".records-range-select")),
        actions: box(document.querySelector(".report-transfer-controls")),
      };
    });
    expect(header.title && header.range && header.actions).toBeTruthy();
    expect(header.range!.left).toBeGreaterThan(header.title!.right);
    expect(header.range!.right).toBeLessThanOrEqual(header.actions!.left + 1);
    expect(
      Math.abs(
        (header.title!.top + header.title!.bottom) / 2 -
          (header.range!.top + header.range!.bottom) / 2
      )
    ).toBeLessThanOrEqual(8);
  });

  test("keeps guest example controls as small icon buttons beside the title", async ({
    page,
  }) => {
    await openGuestRecords(page);

    const title = page.getByRole("heading", { name: "Records" });
    const removeButton = page.getByRole("button", { name: "Delete Sample Data" });
    await expect(title).toBeVisible();
    await expect(removeButton).toBeEnabled();
    await expect(removeButton.locator(".report-transfer-label")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export report" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Import report" })).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const box = (el: Element | null) => {
        const rect = el?.getBoundingClientRect();
        return rect
          ? {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }
          : null;
      };
      return {
        title: box(document.querySelector(".records-page-title h2")),
        remove: box(document.querySelector(".records-demo-remove")),
      };
    });
    expect(layout.title && layout.remove).toBeTruthy();
    expect(layout.remove!.width).toBe(36);
    expect(layout.remove!.height).toBe(36);
    expect(layout.remove!.left).toBeGreaterThan(layout.title!.right);
    expect(
      Math.abs(
        (layout.title!.top + layout.title!.bottom) / 2 -
          (layout.remove!.top + layout.remove!.bottom) / 2
      )
    ).toBeLessThanOrEqual(8);
  });

  test("keeps auto-loaded example data from overflowing a 390px phone", async ({ page }) => {
    await openGuestRecords(page);

    await expect(page.getByRole("heading", { name: /Data insights/ })).toBeVisible();
    await expect(page.locator(".glucose-chart")).toBeVisible();
    await expect(page.locator(".timeline-day-group").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Select date" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("does not overflow a 320px phone with auto-loaded example data", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openGuestRecords(page);
    await assertNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: /Data insights/ })).toBeVisible();
    await expect(page.locator(".record-insights-grid")).toBeVisible();
  });
});
