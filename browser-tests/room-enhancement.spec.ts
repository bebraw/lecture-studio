import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test } from "./audience-fixture";

test("enhanced form preserves choices and updates an independent projection", async ({
  audience,
  browser,
}, testInfo) => {
  await audience.admin("/presenter/rooms/webdev-2026/open-session", undefined, {
    "X-Lecture-Session": "present-test",
  });
  const voter = await browser.newContext();
  const projector = await browser.newContext();
  try {
    const page = await voter.newPage();
    const screen = await projector.newPage();
    const url = new URL("/rooms/webdev-2026", audience.url).href;
    await page.goto(url);
    await screen.goto(url + "?projected=1");
    await expect(screen.locator("form")).toHaveCount(0);
    await page.getByRole("radio").nth(1).check();
    await page.reload();
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
    await page.getByRole("button", { name: "Vote", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Choice saved");
    expect(page.url()).toBe(url);
    await expect(screen.locator("#room-aggregate")).toContainText(
      "1 total votes",
    );
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Vote", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Choice saved");
    await expect(screen.locator("#room-aggregate li").first()).toContainText(
      "— 1",
    );
    await expect(screen.locator("#room-aggregate")).toContainText(
      "1 total votes",
    );
    await page.route("**/rooms/webdev-2026", (route) =>
      route.request().method() === "POST" ? route.abort() : route.continue(),
    );
    await page.getByRole("radio").nth(1).check();
    await page.getByRole("button", { name: "Vote", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Your choice is kept");
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
    await audience.admin("/presenter/rooms/webdev-2026/lock");
    await expect(screen.locator("#room-aggregate")).toContainText(
      "Voting is locked",
    );
    await expect(page.getByRole("radio").nth(1)).toBeDisabled();
    await page.reload();
    await audience.admin("/presenter/rooms/webdev-2026/open");
    await expect(
      page.getByRole("button", { name: "Vote", exact: true }),
    ).toBeEnabled();
    for (const target of [page, screen]) {
      expect(
        (
          await new AxeBuilder({ page: target })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("present-form.png"),
      fullPage: true,
    });
    await screen.screenshot({
      path: testInfo.outputPath("present-projection.png"),
      fullPage: true,
    });
  } finally {
    await voter.close();
    await projector.close();
  }
});
