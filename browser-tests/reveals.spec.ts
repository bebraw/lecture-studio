import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { test } from "./audience-fixture.ts";
import { sections } from "../lib/material.ts";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";

test("reveals synchronize, retain layout, reverse and print complete content", async ({
  audience,
  context,
}) => {
  const path = "Lectures/Test/Presentations/Reveals.md";
  const source = await readFile("examples/progressive-reveals.md", "utf8");
  const library = {
    status: "Connected",
    list: async () => [{ path, label: "Reveals" }],
    read: async () => sections(source),
    close: async () => {},
  };
  const poll = new AudiencePoll({
    origin: audience.url,
    token: "fixture",
    room: "theme",
    fetcher: (url, init) => audience.request(url, init),
  });
  const { stop, address } = await fixture({ library, poll });
  try {
    const desk = await context.newPage();
    const stage = await context.newPage();
    const attendee = await context.newPage();
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await attendee.goto(audience.url);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    await expect(desk.locator("#reveal-status")).toHaveText("Reveal 0 / 3");
    await desk.locator("#reveal-preview summary").click();
    await expect(
      desk
        .frameLocator("#reveal-preview iframe")
        .locator('[data-reveal-step="3"]'),
    ).toBeVisible();
    await desk.locator("#live-toggle").click();
    await expect(stage.locator("h1")).toHaveText("Explain the comparison");
    await expect(
      attendee.locator('[data-reveal-step="1"]').first(),
    ).toBeHidden();
    const tablePosition = await stage.locator("table").boundingBox();
    await desk.locator("#graph-next").click();
    for (const page of [stage, attendee]) {
      await expect(page.locator('[data-reveal-step="1"]')).toHaveCount(2);
      await expect(
        page.locator('[data-reveal-step="1"]').first(),
      ).toBeVisible();
      await expect(page.locator('[data-reveal-step="1"]').last()).toBeVisible();
      await expect(page.locator('[data-reveal-step="2"]')).toBeHidden();
    }
    expect(await stage.locator("table").boundingBox()).toEqual(tablePosition);
    const late = await context.newPage();
    await late.goto(audience.url);
    await expect(late.locator('[data-reveal-step="1"]').first()).toBeVisible();
    await expect(late.locator('[data-reveal-step="2"]')).toBeHidden();
    await desk.locator("#graph-next").click();
    await expect(attendee.locator(".reveal-row-current")).toHaveCount(2);
    await desk.locator("#graph-previous").click();
    await expect(attendee.locator('[data-reveal-step="2"]')).toBeHidden();
    await stage.emulateMedia({ media: "print" });
    await expect(stage.locator('[data-reveal-step="3"]')).toBeVisible();
    await stage.emulateMedia({ media: "screen" });
    await desk.locator("#graph-next").click();
    await desk.locator("#graph-next").click();
    await expect(stage.locator(".reveal-row-current")).toHaveCount(1);
    await stage.screenshot({ path: "test-results/progressive-reveals.png" });
    await desk.locator("#graph-next").click();
    await expect(stage.locator("h1")).toHaveText("The whole process");
    await desk.locator("#graph-previous").click();
    await expect(desk.locator("#reveal-status")).toHaveText("Reveal 3 / 3");
  } finally {
    await stop();
  }
});
