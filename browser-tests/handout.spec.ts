import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { fixture } from "../tests/fixture.ts";

test("attendees can revisit public slides and references without an active lecture", async ({
  audience,
  page,
}) => {
  const deck = parsePresentation(
    sections(
      await readFile("docs/presentations/web-development-2026.md", "utf8"),
    ),
  );
  const local = await fixture();
  try {
    for (const base of [local.address.origin, audience.url]) {
      const response = await fetch(new URL("/slides", base));
      expect(response.status).toBe(200);
      const html = await response.text();
      for (const step of deck.steps)
        if (step.notes) expect(html).not.toContain(step.notes);
      expect(html).not.toContain("wordsInstruction");
      expect(html).not.toContain("approvedWords");
    }
    await page.route("https://**/*", (route) => route.abort());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL("/slides", audience.url).href);
    await expect(page.locator(".slide")).toHaveCount(deck.steps.length);
    await expect(
      page.getByRole("button", { name: "Print / save as PDF" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator("#flow-native .mermaid-graphic svg"),
    ).toBeVisible();
    await page.locator("#vision-otlet footer a").first().click();
    await expect(page.locator("#reference-1")).toBeInViewport();
    await expect(page.locator("#reference-1 a")).toHaveAttribute(
      "href",
      "https://mundaneum.org/en/the-mundaneum/history/",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto(new URL("/slides", audience.url).href);
    await page.screenshot({ path: "test-results/handout-mobile.png" });
    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("button", { name: "Print / save as PDF" }),
    ).toBeHidden();
  } finally {
    await local.stop();
  }
});
