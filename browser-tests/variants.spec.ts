import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { sections } from "../lib/material.ts";
test("the desk loads variants privately and retains the full editable source on reload", async ({
  page,
}) => {
  const path = "Lectures/Test/Presentations/Variants.md";
  const source = `## Presentation

\`\`\`yaml
version: 1
title: Variants
variants:
  short:
    title: Short talk
    slides: [last, first]
    speakingMinutes: 12
    qaMinutes: 3
    durations: {last: 120, first: 60}
\`\`\`

## Slide: First
\`\`\`yaml
id: first
\`\`\`
First.

## Slide: Omitted
\`\`\`yaml
id: omitted
\`\`\`
Omitted.

## Slide: Last
\`\`\`yaml
id: last
\`\`\`
Last.
`;
  const { stop, address } = await fixture({
    library: {
      status: "Connected",
      list: async () => [{ path, label: "Variants" }],
      read: async () => sections(source),
      close: async () => {},
    },
  });
  try {
    await page.goto(address.deskUrl);
    await page.locator("#presentation-name").click();
    await page.locator("#presentation-load").click();
    await page.locator("#presentation-name").click();
    await page.getByLabel("Event variant").selectOption("short");
    await page
      .getByRole("button", { name: "Load variant", exact: true })
      .click();
    await expect(page.locator("#graph-title")).toHaveText("Last");
    await expect(page.locator("#presentation-timing")).toContainText(
      "Speaking 3:00 / 12:00 · Q&A 3:00",
    );
    await expect(page.locator("#presentation-outline button")).toHaveCount(2);
    await page.locator("#graph-next").click();
    await expect(page.locator("#graph-title")).toHaveText("First");
    await page.locator("#presentation-name").click();
    await page.getByRole("button", { name: "Reload from Obsidian" }).click();
    await expect(page.locator("#graph-title")).toHaveText("Last");
    await expect(page.locator("#presentation-outline button")).toHaveCount(2);
    await page.getByLabel("Event variant").selectOption("");
    await page
      .getByRole("button", { name: "Load variant", exact: true })
      .click();
    await expect(page.locator("#presentation-outline button")).toHaveCount(3);
  } finally {
    await stop();
  }
});
