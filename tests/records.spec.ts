import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  openGuestRecords,
  visibleControlSizes,
} from "./recordsHelpers";

test.describe("guest records page", () => {
  test("renders the auto-loaded guest records workspace", async ({ page }) => {
    await openGuestRecords(page);

    await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Time range" })).toHaveValue("week");
    await expect(page.getByRole("button", { name: "Load example data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Sample Data" })).toBeEnabled();
    await expect(page.getByText("Example data", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Export report" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Import report" })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Delete Sample Data" }).click();
    await expect(page.getByText("No records")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete Sample Data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select date" })).toHaveCount(0);
  });

  test("auto-loaded example data exposes insights, chart, and timeline", async ({
    page,
  }) => {
    await openGuestRecords(page);

    await expect(page.getByText("No records")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Load example data" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Sample Data" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Export report" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select date" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show 30 more days" })).toBeVisible();
    await expect(page.locator(".timeline-day-group").first()).toBeVisible();
    await expect(page.locator(".glucose-chart")).toBeVisible();

    await page.getByRole("combobox", { name: "Time range" }).selectOption("day");
    await expect(page.getByRole("combobox", { name: "Time range" })).toHaveValue("day");
    await expect(page.getByRole("heading", { name: /Data insights · Last 1 day/ })).toBeVisible();

    await page.getByRole("button", { name: "Select date" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Select date");
    await page.getByRole("dialog").locator(".date-picker-cancel").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  });

  test("keeps desktop header controls large enough to click", async ({ page }) => {
    await openGuestRecords(page);
    const sizes = await visibleControlSizes(
      page.locator(
        ".records-page-head button, .records-range-select, .report-transfer-controls button"
      )
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const control of sizes) {
      expect(control.height, control.name).toBeGreaterThanOrEqual(24);
      expect(control.width, control.name).toBeGreaterThanOrEqual(24);
    }
  });
});
