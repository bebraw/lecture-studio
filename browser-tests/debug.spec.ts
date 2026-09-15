import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { fixture } from "../tests/fixture.ts";

test("debug view embeds three independent pages and reloads only the selected pane", async ({
  audience,
  page,
}) => {
  const studio = await fixture();
  try {
    await page.route("https://live.scalableweb.dev/**", async (route) => {
      const target = new URL(route.request().url());
      const response = await page.request.get(
        new URL(target.pathname + target.search, audience.url).href,
      );
      await route.fulfill({ response });
    });
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(studio.address.origin + "/debug");
    await expect(
      page
        .frameLocator("#desk")
        .getByRole("button", { name: "Choose presentation", exact: false }),
    ).toBeVisible();
    await expect(
      page.frameLocator("#stage").locator("#stage-content h1"),
    ).toBeVisible();
    await expect(
      page
        .frameLocator("#live")
        .getByRole("heading", { name: "Waiting for the lecturer" }),
    ).toBeVisible();
    const desk = page.frameLocator("#desk").locator("body");
    await desk.evaluate((el) => (el.dataset.debugMarker = "retained"));
    const stage = page.frameLocator("#stage").locator("body");
    await stage.evaluate((el) => (el.dataset.debugMarker = "reload-me"));
    await page.locator('[data-reload="stage"]').click();
    await expect(stage).not.toHaveAttribute("data-debug-marker");
    await expect(desk).toHaveAttribute("data-debug-marker", "retained");
    await page.screenshot({ path: ".local/debug-view.png" });
  } finally {
    await studio.stop();
  }
});
