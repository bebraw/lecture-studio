import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { parseTheme } from "../lib/presentation.ts";
import type { Theme } from "../shared/models.ts";

// Exercise the actual shared stage, preview and PDF renderers at a fixed slide size.
test("rules toggle independently without changing slide geometry or content borders", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const css = await readFile("public/style.css", "utf8");
  const identityCss = await readFile("public/identity.css", "utf8");
  await page.setContent(
    '<body class="stage"><header><span>Chapter</span><div class="identity-top-logo"><img alt="Logo"></div></header><main id="stage-content" class="stage-surface"></main><footer><span>Source</span><span>1/4 · Reveal 1/2</span></footer></body>',
  );
  await page.addStyleTag({
    content: css.replace(/^@import[^;]+;/gm, "") + identityCss,
  });
  const bundle = await build({
    stdin: {
      contents: 'export {applyTheme,renderSurface} from "./public/shared.ts";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "ruleRenderer",
    platform: "browser",
    external: ["/vendor/*"],
  });
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const logo =
    "data:image/svg+xml;base64," +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80"/></svg>',
    ).toString("base64");
  await page.locator(".identity-top-logo img").evaluate((image, src) => {
    (image as HTMLImageElement).src = src;
  }, logo);
  await page
    .locator("body")
    .evaluate((el) => el.style.setProperty("--identity-logo-scale", "2"));
  for (const html of [
    "<p>Title slide</p>",
    `<p><img src="${logo}" alt="Example"></p>`,
    "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>One</td><td>Two</td></tr></tbody></table>",
    '<p>Context</p><p data-reveal-step="1">Revealed content</p>',
  ]) {
    let baseline: unknown;
    for (const rules of [
      {},
      { headerRule: false },
      { footerRule: false },
      { headerRule: false, footerRule: false },
      {},
    ]) {
      await page.evaluate(
        ({ theme, html }) => {
          const renderer = (
            window as unknown as {
              ruleRenderer: {
                applyTheme: (el: HTMLElement, theme: Theme) => void;
                renderSurface: (el: HTMLElement, stage: object) => void;
              };
            }
          ).ruleRenderer;
          renderer.applyTheme(document.body, theme);
          renderer.renderSurface(document.querySelector("main")!, {
            mode: "material",
            title: "A conference title",
            html,
            reveal: { current: 1, total: 1 },
          });
        },
        { theme: parseTheme(rules), html },
      );
      const geometry = await page.evaluate(() => {
        const selectors = ["header", "main", "footer", ".identity-top-logo"];
        return selectors.map((selector) => {
          const box = document.querySelector(selector)!.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height];
        });
      });
      if (!baseline) baseline = geometry;
      expect(geometry).toEqual(baseline);
      await expect(page.locator("header")).toHaveCSS(
        "border-top-color",
        rules.headerRule === false ? "rgba(0, 0, 0, 0)" : "rgb(32, 32, 32)",
      );
      const footerColor = await page
        .locator("footer")
        .evaluate((el) => getComputedStyle(el).borderTopColor);
      expect(footerColor === "rgba(0, 0, 0, 0)").toBe(
        rules.footerRule === false,
      );
      await expect(page.locator("footer")).toContainText("1/4 · Reveal 1/2");
      if (html.includes("<table>"))
        await expect(page.locator("th").first()).not.toHaveCSS(
          "border-bottom-color",
          "rgba(0, 0, 0, 0)",
        );
    }
  }
});

test("both PDF modes preserve independent rule settings across title, image, table and reveals", async ({
  page,
}, testInfo) => {
  const css = (await readFile("public/style.css", "utf8"))
    .replace(/^@import[^;]+;/gm, "")
    .replaceAll("#stage-content", ".pdf-content");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.setContent("<body></body>");
  await page.addStyleTag({
    content:
      css +
      (await readFile("public/identity.css", "utf8")) +
      (await readFile("public/pdf.css", "utf8")) +
      ":root{--pdf-width:1920px;--pdf-height:1080px}@page{size:1920px 1080px;margin:0}",
  });
  const bundle = await build({
    entryPoints: ["public/pdf-renderer.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    external: ["/vendor/*"],
  });
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const logo =
    "data:image/svg+xml;base64," +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80"/></svg>',
    ).toString("base64");
  const contents = [
    "<p>Opening</p>",
    `<p><img src="${logo}" alt="Example"></p>`,
    "<table><tr><th>First</th><th>Second</th></tr><tr><td>A</td><td>B</td></tr></table>",
    '<p>Context</p><p data-reveal-step="1">Revealed point</p>',
  ];
  for (const mode of ["presentation", "publication"] as const) {
    for (const rules of [
      {},
      { headerRule: false },
      { footerRule: false },
      { headerRule: false, footerRule: false },
    ]) {
      const slides = contents.map((html, index) => ({
        mode,
        id: "slide-" + index,
        label: `Slide ${index + 1} / 4 · Reveal 1 / 1`,
        stage: {
          mode: "material",
          title: index === 0 ? "Title slide" : "Example",
          slideType: index === 0 ? "title" : "material",
          act: "Chapter",
          source: "Source credit",
          html,
          theme: parseTheme(rules),
          identity: { logo, logoPosition: "top-right" as const, logoScale: 2 },
        },
      }));
      await page.evaluate(async (slides) => {
        document.body.replaceChildren();
        await window.renderPdf(slides);
      }, slides);
      for (const root of await page.locator(".pdf-slide").all()) {
        await expect(root.locator("header")).toHaveCSS(
          "border-top-width",
          "3px",
        );
        await expect(root.locator("footer")).toHaveCSS(
          "border-top-width",
          "1px",
        );
        expect(
          await root
            .locator("header")
            .evaluate(
              (el) =>
                getComputedStyle(el).borderTopColor === "rgba(0, 0, 0, 0)",
            ),
        ).toBe(rules.headerRule === false);
        expect(
          await root
            .locator("footer")
            .evaluate(
              (el) =>
                getComputedStyle(el).borderTopColor === "rgba(0, 0, 0, 0)",
            ),
        ).toBe(rules.footerRule === false);
        await expect(root.locator(".identity-top-logo img")).toBeVisible();
        await expect(root.locator("footer")).toContainText("Source credit");
      }
    }
    await page.pdf({
      path: testInfo.outputPath(mode + ".pdf"),
      width: "1920px",
      height: "1080px",
      printBackground: true,
      preferCSSPageSize: true,
    });
  }
});
