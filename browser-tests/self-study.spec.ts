import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, sep } from "node:path";
import { exportStudy } from "../lib/study-export.ts";
import { asyncHandler } from "../shared/errors.ts";
let directory: string;
let server: Server;
let origin: string;
test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-browser-"));
  const output = join(directory, "site");
  await exportStudy("examples/self-study/course.json", output);
  server = createServer(
    asyncHandler(async (req, res) => {
      try {
        const url = new URL(req.url || "/", "http://localhost");
        if (!url.pathname.startsWith("/learn/pilot/")) {
          res.writeHead(404).end();
          return;
        }
        const file = resolve(
          output,
          decodeURIComponent(url.pathname.slice("/learn/pilot/".length)) ||
            "index.html",
        );
        if (!file.startsWith(output + sep)) {
          res.writeHead(404).end();
          return;
        }
        res.setHeader(
          "content-type",
          (
            {
              ".mjs": "text/javascript",
              ".json": "application/json",
              ".css": "text/css",
              ".html": "text/html",
            } as Record<string, string>
          )[extname(file)] || "application/octet-stream",
        );
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end();
      }
    }),
  );
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing address");
  origin = `http://127.0.0.1:${address.port}/learn/pilot/`;
});
test.afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
  await rm(directory, { recursive: true, force: true });
});
test("self-study runs under a nested path with private progress, independent demos and authored checks", async ({
  page,
  browser,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto(origin);
  await expect(page.locator(".module-list li")).toHaveCount(2);
  await page.locator(".module-start").first().click();
  await expect(page.locator("#slide-pressure")).toBeVisible();
  await page.locator("#slide-pressure .complete-step").click();
  await expect(page.locator("#study-progress")).toHaveText(
    "1 of 3 sections complete",
  );
  await page.locator("#study-next").click();
  const demo = page.frameLocator(".web-demo-frame");
  await expect(demo.locator("#speedup")).toHaveText("2.50×");
  await demo.locator("#workers").fill("16");
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await page.reload();
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await expect(page.locator("#study-progress")).toHaveText(
    "1 of 3 sections complete",
  );
  const other = await browser.newContext();
  const independent = await other.newPage();
  await independent.goto(origin + "scalability/index.html#slide-amdahl");
  await expect(
    independent.frameLocator(".web-demo-frame").locator("#speedup"),
  ).toHaveText("2.50×");
  await other.close();
  await page.screenshot({
    path: "/private/tmp/self-study-demo.png",
    fullPage: true,
  });
  await page.locator("#study-next").click();
  await page.getByLabel("4×: four workers make it four times faster").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".answer-result")).toContainText("Not quite");
  await page
    .getByLabel("2.5×: the sequential portion still takes time")
    .check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".answer-result")).toContainText("Correct");
  await page.getByText("Reveal discussion", { exact: true }).click();
  await expect(page.locator(".activity details")).toContainText(
    "not a promise",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "All modules" }).click();
  await expect(page.locator(".module-progress").first()).toHaveText(
    "1 / 3 complete",
  );
  await page.screenshot({
    path: "/private/tmp/self-study-index.png",
    fullPage: true,
  });
  await page.locator(".module-start").nth(1).click();
  await expect(page.locator(".study-diagram svg")).toBeVisible();
  expect(requested.every((url) => url.startsWith(new URL(origin).origin))).toBe(
    true,
  );
  expect(requested.some((url) => url.includes("/api/"))).toBe(false);
});
test("reading remains available without JavaScript and when storage is blocked", async ({
  browser,
}) => {
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const reading = await noJs.newPage();
  await reading.goto(origin + "scalability/index.html");
  await expect(reading.locator(".study-step:visible")).toHaveCount(3);
  await reading.getByText("Reveal discussion", { exact: true }).click();
  await expect(reading.locator(".activity details")).toContainText(
    "not a promise",
  );
  await noJs.close();
  const restricted = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await restricted.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    }),
  );
  const mobile = await restricted.newPage();
  await mobile.goto(origin + "scalability/index.html#slide-amdahl");
  await expect(mobile.locator("#storage-status")).toContainText(
    "save progress",
  );
  await expect(
    mobile.frameLocator(".web-demo-frame").locator("#speedup"),
  ).toHaveText("2.50×");
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await restricted.close();
});
