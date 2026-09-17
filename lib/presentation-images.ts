import MarkdownIt from "markdown-it";
import { posix } from "node:path";
import type { PresentationDefinition, Step } from "../shared/models.ts";

const loaded = new WeakMap<Step, Record<string, string>>();
export const imageSources = (step: Step) => loaded.get(step) || {};
export const relativeImage =
  /^\.\/(?!.*(?:\.\.|[\\:#?%]))[^\r\n]+\.(?:svg|png|jpe?g|gif|webp)$/i;
export function imageData(path: string, bytes: Uint8Array) {
  if (!relativeImage.test(path))
    throw new Error("Use a presentation-relative image path");
  if (bytes.length > 2_000_000) throw new Error("Image exceeds 2 MB");
  const extension = path.split(".").at(-1)!.toLowerCase();
  const mime =
    extension === "svg"
      ? "image/svg+xml"
      : extension === "jpg"
        ? "image/jpeg"
        : "image/" + extension;
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
export async function loadPresentationImages(
  deck: PresentationDefinition,
  read: (relative: string) => Promise<Uint8Array>,
) {
  const cache = new Map<string, string>();
  let totalBytes = 0;
  for (const step of deck.steps) {
    const paths = new Set<string>();
    for (const markdown of [
      step.body,
      step.study?.explanation,
      step.study?.prompt,
      step.study?.answer,
    ]) {
      for (const token of new MarkdownIt().parse(markdown || "", {})) {
        for (const child of token.children || []) {
          const src = child.type === "image" ? child.attrGet("src") : null;
          if (typeof src === "string" && src.startsWith("./")) paths.add(src);
        }
      }
    }
    if (step.demoPoster) paths.add(step.demoPoster);
    const images: Record<string, string> = {};
    for (const path of paths) {
      const decoded = decodeURIComponent(path);
      if (!relativeImage.test(decoded))
        throw new Error("Invalid presentation image: " + path);
      const normalized = "./" + posix.normalize(decoded);
      if (!cache.has(normalized)) {
        const bytes = await read(decoded);
        totalBytes += bytes.length;
        if (totalBytes > 16_000_000)
          throw new Error("Presentation images exceed 16 MB");
        cache.set(normalized, imageData(decoded, bytes));
      }
      images[path] = cache.get(normalized)!;
      images[new MarkdownIt().normalizeLink(decoded)] = cache.get(normalized)!;
    }
    loaded.set(step, images);
  }
}
export function posterMarkdown(step: Step) {
  return step.demoPoster ? `\n\n![Demo preview](<${step.demoPoster}>)` : "";
}
