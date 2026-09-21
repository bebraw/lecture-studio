import { readFile, realpath, mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
import { parsePresentation } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { loadPresentationImages } from "../lib/presentation-images.ts";
import { pdfSlides } from "../lib/pdf-plan.ts";
import type { PdfOptions } from "../shared/pdf.ts";
const root = fileURLToPath(new URL("../", import.meta.url));

export async function exportPdf(
  source: string,
  output: string,
  options: Pick<PdfOptions, "aspectRatio"> = {},
) {
  if (extname(output).toLowerCase() !== ".pdf")
    throw new Error("Output filename must end in .pdf");
  const input = await realpath(source);
  if (resolve(output) === input)
    throw new Error("Output must not replace the source");
  const directory = dirname(input);
  const read = async (path: string) => {
    try {
      const file = await realpath(resolve(directory, path));
      if (!file.startsWith(directory + sep))
        throw new Error("Asset escapes the presentation directory");
      return await readFile(file);
    } catch (error) {
      throw new Error(`Cannot load asset ${path}: ${String(error)}`);
    }
  };
  const deck = parsePresentation(sections(await readFile(input, "utf8")));
  await loadPresentationImages(deck, read);
  const slides = pdfSlides(deck);
  const ratio = options.aspectRatio || deck.pdf?.aspectRatio || "16:9";
  if (!["16:9", "4:3"].includes(ratio))
    throw new Error("Aspect ratio must be 16:9 or 4:3");
  const width = 1920,
    height = ratio === "16:9" ? 1080 : 1440;
  let fonts = "";
  for (const font of deck.pdf?.fonts || []) {
    const bytes = await read(font.source);
    if (bytes.length > 5_000_000)
      throw new Error(`Font exceeds 5 MB: ${font.source}`);
    fonts += `@font-face{font-family:"${font.family}";src:url(data:font/${extname(font.source).slice(1)};base64,${bytes.toString("base64")});font-weight:${font.weight || "normal"};font-style:${font.style || "normal"};}`;
  }
  const bundle = await build({
    absWorkingDir: root,
    entryPoints: ["public/pdf-renderer.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    external: ["/vendor/*"],
  });
  const css = (
    await readFile(resolve(root, "public/style.css"), "utf8")
  ).replaceAll("#stage-content", ".pdf-content");
  const assets = new Map<
    string,
    { body: string | Buffer; contentType: string }
  >([
    [
      "/",
      {
        body: '<!doctype html><html><head><meta charset="utf-8"><title></title><link rel="stylesheet" href="/style.css"></head><body></body></html>',
        contentType: "text/html",
      },
    ],
    [
      "/style.css",
      {
        body:
          css +
          "\n" +
          (await readFile(resolve(root, "public/pdf.css"), "utf8")) +
          fonts +
          `\n:root{--pdf-width:${width}px;--pdf-height:${height}px}@page{size:${width}px ${height}px;margin:0}`,
        contentType: "text/css",
      },
    ],
  ]);
  for (const name of ["identity.css", "reveals.css"])
    assets.set("/" + name, {
      body: await readFile(resolve(root, "public", name)),
      contentType: "text/css",
    });
  const browser = await chromium.launch();
  const temporary = resolve(dirname(output), "." + randomUUID() + ".pdf");
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      serviceWorkers: "block",
    });
    const failures: string[] = [];
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      let asset =
        url.origin === "https://pdf.studio.invalid"
          ? assets.get(url.pathname)
          : undefined;
      if (url.origin === "https://pdf.studio.invalid" && !asset) {
        const base = url.pathname.startsWith("/vendor/mermaid/")
          ? resolve(root, "node_modules/mermaid/dist")
          : url.pathname.startsWith("/images/")
            ? resolve(root, "public/images")
            : "";
        const relative = url.pathname.replace(
          /^\/(?:vendor\/mermaid|images)\//,
          "",
        );
        if (base) {
          const file = resolve(base, relative);
          if (file.startsWith(base + sep)) {
            try {
              asset = {
                body: await readFile(file),
                contentType: file.endsWith(".mjs")
                  ? "text/javascript"
                  : file.endsWith(".svg")
                    ? "image/svg+xml"
                    : "image/" + extname(file).slice(1),
              };
            } catch {
              /* Report below. */
            }
          }
        }
      }
      if (asset) await route.fulfill(asset);
      else {
        failures.push(url.href);
        await route.abort();
      }
    });
    await page.goto("https://pdf.studio.invalid/");
    await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
    await page.evaluate((title) => {
      document.title = title;
    }, deck.title);
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    await page.evaluate(async () => {
      await Promise.all([...document.fonts].map((font) => font.load()));
    });
    await page.evaluate((pages) => window.renderPdf(pages), slides);
    await page.evaluate(async () => {
      await document.fonts.ready;
      if ([...document.fonts].some((font) => font.status === "error"))
        throw new Error("A configured font failed to load");
    });
    if (failures.length)
      throw new Error("Export could not load assets: " + failures.join(", "));
    await mkdir(dirname(resolve(output)), { recursive: true });
    await page.pdf({
      path: temporary,
      width: `${width}px`,
      height: `${height}px`,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });
    await rename(temporary, resolve(output));
    return { pages: slides.length, slides: deck.steps.length, width, height };
  } finally {
    await browser.close();
    await rm(temporary, { force: true });
  }
}
