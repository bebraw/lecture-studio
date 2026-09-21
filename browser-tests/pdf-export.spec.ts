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
