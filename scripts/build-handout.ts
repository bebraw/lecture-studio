import { readFile, writeFile, mkdir } from "node:fs/promises";
import { sections } from "../lib/material.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { renderHandout } from "../lib/handout.ts";
const root = new URL("../", import.meta.url);
const source = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd()}/`)
  : new URL("docs/presentations/web-development-2026.md", root);
const deck = parsePresentation(sections(await readFile(source, "utf8")));
await mkdir(new URL(".local/browser/public/", root), { recursive: true });
await writeFile(
  new URL(".local/browser/public/slides.html", root),
  renderHandout(deck),
);
