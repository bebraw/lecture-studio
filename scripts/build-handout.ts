import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPresentationImages } from "../lib/presentation-images.ts";
import { sections } from "../lib/material.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { renderHandout } from "../lib/handout.ts";
const root = new URL("../", import.meta.url);
const source = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd()}/`)
  : new URL("docs/presentations/web-development-2026.md", root);
const deck = parsePresentation(sections(await readFile(source, "utf8")));
const directory = dirname(await realpath(fileURLToPath(source)));
await loadPresentationImages(deck, async (image) => {
  const path = await realpath(resolve(directory, image));
  if (!path.startsWith(directory + sep))
    throw new Error("Image must stay inside the presentation directory");
  return readFile(path);
});
await mkdir(new URL(".local/browser/public/", root), { recursive: true });
await writeFile(
  new URL(".local/browser/public/slides.html", root),
  renderHandout(deck),
);
