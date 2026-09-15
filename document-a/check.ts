import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const browser = await chromium.launch();
const previewUrl = process.env.DOCUMENT_A_URL || "http://127.0.0.1:4321";
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(previewUrl);
    assert.ok(response);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("form, script, input").count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `/private/tmp/document-a-verified-${width}.png`,
      fullPage: true,
    });
    console.log(`PASS: ${width}px layout with JavaScript disabled`);
  }
  await page.keyboard.press("Tab");
  assert.equal(
    await page.locator(":focus").textContent(),
    "Skip to seminar essentials",
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(":focus").getAttribute("id"), "main");
  for (const link of await page.locator('a[href^="#"]').all()) {
    assert.equal(
      await page.locator((await link.getAttribute("href"))!).count(),
      1,
    );
  }
  assert.deepEqual(errors, []);
  console.log("PASS: keyboard skip link, internal anchors, no page errors");
  const context = await browser.newContext();
  const accessiblePage = await context.newPage();
  await accessiblePage.goto(previewUrl);
  const accessibility = await new AxeBuilder({ page: accessiblePage })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(accessibility.violations, []);
  console.log("PASS: automated WCAG A/AA accessibility scan");
} finally {
  await browser.close();
}
