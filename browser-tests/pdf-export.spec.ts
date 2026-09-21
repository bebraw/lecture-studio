import { captureDemoFrames } from "../scripts/pdf-demo.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportPdf } from "../scripts/pdf-export.ts";
const source = `## Presentation

\`\`\`yaml
version: 1
title: Portable conference talk
\`\`\`

## Slide: Vector diagram

\`\`\`yaml
id: diagram
source: Public source credit
\`\`\`

\`\`\`mermaid
flowchart LR
A[Request] --> B[Result]
\`\`\`

<!-- speaker-notes -->

PRIVATE_NOTE
`;
test("fixed PDF canvases embed diagrams and fail clearly on clipped or missing content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pdf-export-"));
  try {
    const input = join(directory, "talk.md"),
      output = join(directory, "talk.pdf");
    await writeFile(input, source);
    for (const aspectRatio of ["16:9", "4:3"] as const) {
      const result = await exportPdf(input, output, { aspectRatio });
      expect(result.pages).toBe(1);
      expect(result.height).toBe(aspectRatio === "16:9" ? 1080 : 1440);
      const pdf = (await readFile(output)).toString("latin1");
      expect(pdf.startsWith("%PDF-")).toBe(true);
      expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
      expect(pdf).toContain("/FontFile");
    }
    const original = await readFile(output);
    await writeFile(input, source.replace("flowchart LR", "invalid Mermaid"));
    await expect(exportPdf(input, output)).rejects.toThrow(/diagram failed/);
    expect(await readFile(output)).toEqual(original);
    await writeFile(
      input,
      source +
        "\n## Slide: Overflow\n\n```yaml\nid: overflow\n```\n\n" +
        "Too much content. ".repeat(600),
    );
    await expect(exportPdf(input, output)).rejects.toThrow(
      /overflow.*(boundaries|overlaps)/,
    );
    await writeFile(
      input,
      source +
        "\n## Slide: Asset\n\n```yaml\nid: asset\n```\n\n![Missing](./missing.png)",
    );
    await expect(exportPdf(input, output)).rejects.toThrow(/missing.png/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("PDF pages follow reveals and retain separate logical slide labels", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pdf-reveals-"));
  try {
    const output = join(directory, "reveals.pdf");
    const result = await exportPdf("examples/progressive-reveals.md", output);
    expect(result.pages).toBe(7);
    expect(result.slides).toBe(3);
    expect(
      (await readFile(output)).toString("latin1").match(/\/Type \/Page\b/g),
    ).toHaveLength(7);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("authored demo states export in order and a broken frame fails without replacing the PDF", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pdf-demo-"));
  try {
    const output = join(directory, "talk.pdf");
    const result = await exportPdf("examples/conference/talk.md", output);
    expect(result.slides).toBe(5);
    expect(result.pages).toBe(10);
    const input = join(directory, "broken.md");
    const demo =
      '<p>Broken</p><script>LectureDemo.onState(async (state) => { if (state.fail) throw new Error("Broken frame"); });</script>';
    await writeFile(join(directory, "broken.html"), demo);
    await writeFile(
      input,
      "## Presentation\n\n```yaml\nversion: 1\ntitle: Broken frame\n```\n\n## Slide: Example\n\n```yaml\nid: broken\ndemo: ./broken.html\ndemoSequence:\n  - state: '{\"fail\":true}'\n    caption: Failure must be reported\n```",
    );
    const original = await readFile(output);
    await expect(exportPdf(input, output)).rejects.toThrow(
      /broken, frame 1.*rendering error/,
    );
    expect(await readFile(output)).toEqual(original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("demo captures are repeatable and each authored state changes the visual", async ({
  browser,
}) => {
  const deck = parsePresentation(
    sections(await readFile("examples/conference/talk.md", "utf8")),
  );
  const read = (path: string) => readFile(join("examples/conference", path));
  const first = await captureDemoFrames(browser, deck, read);
  const second = await captureDemoFrames(browser, deck, read);
  expect(second).toEqual(first);
  expect(new Set(first.order).size).toBe(4);
});
