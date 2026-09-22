import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { authoringMarkdown, parsePresentation } from "../lib/presentation.ts";
import { exportPdf } from "../scripts/pdf-export.ts";
import type { PresentationDefinition } from "../shared/models.ts";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#142d40"/><text x="15" y="54" fill="white" font-size="40">LOGO</text></svg>';
const authored: Omit<PresentationDefinition, "theme"> = {
  version: 1,
  title: "Header logo",
  start: "text",
  identity: { logo: "./logo.svg", logoPosition: "top-right" },
  steps: [
    {
      id: "text",
      type: "material",
      title: "A long conference title with enough words to span multiple lines",
      body: "First point.\n\nSecond point.\n\nThird point.",
      source: "Source credit",
      next: "image",
    },
    {
      id: "image",
      type: "material",
      title: "Image",
      body: "![Example](./logo.svg)",
      next: "reveal",
    },
    {
      id: "reveal",
      type: "material",
      title: "Reveal",
      body: "Context.\n\n::: reveal 1\nRevealed point.\n:::",
      next: "appendix",
    },
    {
      id: "appendix",
      type: "material",
      chapter: "Appendix",
      title: "Appendix",
      body: "Additional detail.",
      next: "hidden",
    },
    {
      id: "hidden",
      type: "material",
      title: "Hidden identity",
      hideIdentity: true,
      body: "No branding.",
    },
  ],
};

const deck = parsePresentation({
  sections: [
    {
      heading: "Presentation",
      body: "```json\n" + JSON.stringify(authored) + "\n```",
    },
  ],
});

for (const scale of [undefined, 2]) {
  test(`top-right logos at ${scale ?? "default"} reserve header space on stage and previews without an identity footer`, async ({
    browser,
  }, testInfo) => {
    const path = "Lectures/Test/Presentations/Logo.md";
    const local = await fixture({
      library: {
        status: "Connected",
        list: async () => [{ path, label: "Logo" }],
        read: async () => ({
          sections: [
            {
              heading: "Presentation",
              body:
                "```json\n" +
                JSON.stringify({
                  ...deck,
                  identity: {
                    ...deck.identity,
                    ...(scale === undefined ? {} : { logoScale: scale }),
                  },
                }) +
                "\n```",
            },
          ],
        }),
        readImage: async () => Buffer.from(svg),
        close: async () => {},
      },
    });
    const desk = await browser.newPage();
    const stage = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    try {
      await desk.goto(local.address.deskUrl);
      await desk.locator("#presentation-name").click();
      await desk.locator("#presentation-load").click();
      await desk.locator("#live-toggle").click();
      await stage.goto(local.address.stageUrl);
      const preview = desk.frameLocator("#current-stage > iframe");
      for (const step of deck.steps) {
        await expect(stage.locator("h1")).toHaveText(step.title);
        await expect(preview.locator("h1")).toHaveText(step.title);
        for (const surface of [stage, preview]) {
          await expect(surface.locator(".presentation-identity")).toHaveCount(
            0,
          );
          await expect(surface.locator(".identity-top-logo")).toHaveCount(
            step.hideIdentity ? 0 : 1,
          );
          if (!step.hideIdentity) {
            const geometry = await surface
              .locator(".stage")
              .evaluate((root) => {
                const logo = root
                  .querySelector(".identity-top-logo img")!
                  .getBoundingClientRect();
                const main = root
                  .querySelector("main")!
                  .getBoundingClientRect();
                const header = root
                  .querySelector("header")!
                  .getBoundingClientRect();
                return {
                  logoWidth: logo.width,
                  logoBottom: logo.bottom,
                  mainTop: main.top,
                  logoRight: logo.right,
                  headerRight: header.right,
                  ratio: logo.width / logo.height,
                };
              });
            expect(geometry.logoBottom).toBeLessThanOrEqual(geometry.mainTop);
            expect(geometry.logoRight).toBeCloseTo(geometry.headerRight, 0);
            expect(geometry.logoWidth).toBeCloseTo(160 * (scale ?? 1), 0);
            expect(geometry.ratio).toBeCloseTo(3, 1);
          }
        }
        if (step.id === "text") {
          await expect(stage.locator("#source-credit")).toHaveText(
            "Source credit",
          );
          await stage.screenshot({
            path: testInfo.outputPath("top-right-logo.png"),
          });
        }
        if (step.id === "reveal") await desk.locator("#graph-next").click();
        if (step.next) await desk.locator("#graph-next").click();
      }
    } finally {
      await desk.close();
      await stage.close();
      await local.stop();
    }
  });

  test(`header logos at ${scale ?? "default"} fit presentation and publication PDFs including demo frames`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "logo-pdf-"));
    try {
      const source = structuredClone(deck);
      if (scale !== undefined) source.identity!.logoScale = scale;
      source.steps.push({
        id: "demo",
        type: "material",
        title: "Example state",
        demoSequence: [{ image: "./logo.svg", caption: "An authored frame." }],
      });
      source.identity!.joinUrl = "https://example.org/live-session";
      source.identity!.qrCode = "./logo.svg";
      // Publication removes live participation links but retains header branding.
      await writeFile(join(directory, "logo.svg"), svg);
      await writeFile(join(directory, "talk.md"), authoringMarkdown(source));
      for (const mode of ["presentation", "publication"] as const) {
        const result = await exportPdf(
          join(directory, "talk.md"),
          test.info().outputPath(mode + ".pdf"),
          { mode },
        );
        expect(result.slides).toBe(6);
        expect(result.pages).toBe(mode === "presentation" ? 7 : 6);
      }
      source.steps[0]!.body = "Dense slide content. ".repeat(500);
      await writeFile(join(directory, "talk.md"), authoringMarkdown(source));
      for (const mode of ["presentation", "publication"] as const)
        await expect(
          exportPdf(
            join(directory, "talk.md"),
            join(directory, "overflow.pdf"),
            { mode },
          ),
        ).rejects.toThrow(/text.*(boundaries|overlaps)/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
