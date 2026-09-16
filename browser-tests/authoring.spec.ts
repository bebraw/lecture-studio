import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fixture } from "../tests/fixture.ts";
import { sections } from "../lib/material.ts";

test("Obsidian edits reload privately and reading copies use the validated snapshot", async ({
  page,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Authored.md";
  let content =
    '# My lecture\n\n## Presentation\n\n```json\n{"version":1,"title":"My lecture"}\n```\n\n## Slide: My example\n\n```json\n{"id":"example"}\n```\n\nOriginal example.\n\n<!-- speaker-notes -->\n\nPRIVATE speaker notes.\n\n## Slide: Build\n\n```json\n{"id":"build","type":"build"}\n```\n\nPRIVATE implementation prompt.\n';
  const { address, stop } = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Authored" }],
      read: async () => sections(content),
      close: async () => {},
    },
  });
  try {
    await page.goto(address.deskUrl);
    await page.locator("#presentation-name").click();
    await page.locator("#presentation-load").click();
    await expect(page.locator("#live-toggle")).toHaveText("Live off");
    const readingCopy = async () =>
      (await page.request.get(address.origin + "/slides")).text();
    expect(await readingCopy()).toContain("Original example.");
    expect(await readingCopy()).not.toContain("PRIVATE");
    content = content.replace("Original example.", "Revised example.");
    expect(await readingCopy()).toContain("Original example.");
    await page.locator("#presentation-name").click();
    await page
      .getByRole("button", { name: "Reload from Obsidian", exact: true })
      .click();
    await expect.poll(readingCopy).toContain("Revised example.");
    await expect(page.locator("#live-toggle")).toHaveText("Live off");
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download editable Markdown", exact: true })
      .click();
    const file = await (await download).path();
    if (!file) throw new Error("No downloaded authoring file");
    expect(await readFile(file, "utf8")).toContain("## Slide: My example");
    content = content.replace('"version":1', '"version":2');
    await page
      .getByRole("button", { name: "Reload from Obsidian", exact: true })
      .click();
    await expect(page.locator("#presentation-message")).not.toBeEmpty();
    expect(await readingCopy()).toContain("Revised example.");
  } finally {
    await stop();
  }
});
