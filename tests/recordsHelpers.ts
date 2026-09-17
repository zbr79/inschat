import { expect, type Locator, type Page } from "@playwright/test";

export async function openGuestRecords(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("inschat_ui_lang", "en");
    window.localStorage.setItem("inschat_visitor_intent", "chat");
  });
  await page.goto("/records", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/InsChat/i);
  await expect(page.getByRole("heading", { name: "Records" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
}

export async function loadExampleRecords(page: Page) {
  await page.getByRole("button", { name: "Load example data" }).click();
  await expect(page.getByRole("button", { name: "Remove example data" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: /Data insights/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blood glucose trend" })).toBeVisible();
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
      clientWidth: root.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `page scrollWidth ${overflow.scrollWidth} exceeded viewport ${overflow.clientWidth}`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function visibleControlSizes(locator: Locator) {
  return locator.evaluateAll((elements) =>
    elements
      .map((element) => {
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const hidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          box.width === 0 ||
          box.height === 0;
        return hidden
          ? null
          : {
              name:
                element.getAttribute("aria-label") ||
                element.textContent?.replace(/\s+/g, " ").trim() ||
                element.className.toString(),
              width: Math.round(box.width),
              height: Math.round(box.height),
            };
      })
      .filter((item): item is { name: string; width: number; height: number } => item !== null)
  );
}
