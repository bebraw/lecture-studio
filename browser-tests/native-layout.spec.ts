import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fixture } from "../tests/fixture.ts";
import { sections } from "../lib/material.ts";
import { parsePresentation } from "../lib/presentation.ts";

test("native submission diagrams render within the projected slide", async ({
  context,
}) => {
  const deck = parsePresentation(
    sections(
      await readFile("docs/presentations/web-development-2026.md", "utf8"),
    ),
  );
  const steps = deck.steps.filter((s) => s.id.startsWith("flow-native"));
  const definition = {
    version: 1,
    title: "Native flow",
    start: steps[0]!.id,
    steps: steps.map((s, i) => ({ ...s, related: [], next: steps[i + 1]?.id })),
  };
  const path = "Lectures/Web Development 2026/Presentations/Native.md";
  const { address, stop } = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Native flow" }],
      read: async () => ({
        sections: [
          {
            heading: "Presentation",
            body: "```json\n" + JSON.stringify(definition) + "\n```",
          },
        ],
      }),
      close: async () => {},
    },
  });
  try {
    const desk = await context.newPage();
    const stage = await context.newPage();
    await stage.setViewportSize({ width: 1280, height: 720 });
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    await desk.locator("#live-toggle").click();
    let actorTop: number | undefined;
    for (const [i, step] of steps.entries()) {
      if (i) await desk.locator("#graph-next").click();
      await expect(
        stage.getByRole("heading", { name: step.title }),
      ).toBeVisible();
      const svg = stage.locator(".mermaid-graphic svg");
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(720);
      await expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMin meet");
      await stage.waitForTimeout(400);
      const top = await svg
        .locator("rect.actor")
        .evaluateAll((nodes) =>
          Math.min(...nodes.map((node) => node.getBoundingClientRect().top)),
        );
      if (actorTop !== undefined)
        expect(Math.abs(top - actorTop)).toBeLessThan(3);
      actorTop = top;
      await stage.screenshot({ path: `.local/native-layout-${i + 1}.png` });
    }
  } finally {
    await stop();
  }
});
