import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm, cp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, sep } from "node:path";
import { exportStudy } from "../lib/study-export.ts";
import { demoDocument } from "../shared/demo-document.ts";
import { asyncHandler } from "../shared/errors.ts";
let directory: string;
let server: Server;
let origin: string;
test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "study-browser-"));
  const output = join(directory, "site");
  await cp("examples", join(directory, "examples"), { recursive: true });
  const source = join(directory, "examples/demos/scalability-study.md");
  await writeFile(
    source,
    (await readFile(source, "utf8"))
      .replace(
        "demo: ./amdahl.html",
        "demo: ./amdahl.html\ndemoPoster: ./poster.svg",
      )
      .replace(
        "What changes if you increase the parallel portion instead?",
        "What changes if you increase the parallel portion instead?\n\n![Regular illustration](./poster.svg)",
      ),
  );
  await writeFile(
    join(directory, "examples/demos/poster.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text y="50">2.5×</text></svg>',
  );
  const revealSource = await readFile(source, "utf8");
  const slideStart = revealSource.indexOf("## Slide:");
  const nextSlide = revealSource.indexOf(
    "<!-- speaker-notes -->",
    slideStart + 1,
  );
  await writeFile(
    source,
    revealSource.slice(0, nextSlide) +
      "\n::: reveal 1\nFirst revealed point.\n:::\n\n::: reveal 2\nSecond revealed point.\n:::\n\n" +
      revealSource.slice(nextSlide),
  );
  const measurement = join(directory, "examples/self-study/measurement.md");
  await writeFile(
    measurement,
    (await readFile(measurement, "utf8")).replace(
      "id: request-path",
      "id: request-path\ndemo: ./amdahl.html",
    ),
  );
  await cp(
    join(directory, "examples/demos/amdahl.html"),
    join(directory, "examples/self-study/amdahl.html"),
  );
  await exportStudy(join(directory, "examples/self-study/course.json"), output);
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
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeHidden();
  await expect(page.getByAltText("Regular illustration")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset experiment" }),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeVisible();
  await expect(page.locator(".demo-host")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  expect(
    await demo.locator("body").evaluate(async () => {
      try {
        await fetch(new URL("/csp-probe", location.href));
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await demo.locator("#workers").fill("16");
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await page.reload();
  await expect(demo.locator("#speedup")).toHaveText("4.00×");
  await expect(page.locator("#study-progress")).toHaveText(
    "1 of 3 sections complete",
  );
  await page.getByRole("button", { name: "Reset experiment" }).click();
  await expect(demo.locator("#speedup")).toHaveText("2.50×");
  await expect(page.locator("#slide-amdahl .demo-poster")).toBeHidden();
  const other = await browser.newContext();
  const independent = await other.newPage();
  await independent.goto(origin + "scalability/index.html#slide-amdahl");
  await expect(
    independent.frameLocator(".web-demo-frame").locator("#speedup"),
  ).toHaveText("2.50×");
  await other.close();
  await page.screenshot({
    path: test.info().outputPath("self-study-demo.png"),
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
    path: test.info().outputPath("self-study-index.png"),
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
  await expect(reading.locator(".demo-host")).toBeHidden();
  await expect(reading.locator(".demo-poster")).toBeVisible();
  await expect(reading.getByAltText("Regular illustration")).toBeVisible();
  await reading.setViewportSize({ width: 390, height: 844 });
  await expect(reading.locator(".demo-host")).toBeHidden();
  await expect(reading.locator(".demo-poster")).toBeVisible();
  await reading.getByText("Reveal discussion", { exact: true }).click();
  await expect(reading.locator(".activity details")).toContainText(
    "not a promise",
  );
  await reading.goto(origin + "measurement/index.html");
  await expect(reading.locator(".demo-host")).toBeHidden();
  await expect(reading.locator(".demo-poster")).toHaveCount(0);
  await expect(
    reading.getByText(
      "The slowest segment is not necessarily the same under every workload.",
    ),
  ).toBeVisible();
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

test("a failed or uninitialized demo retains its poster and reading content", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/demos/amdahl.html*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/html",
      body: "Demo unavailable",
    }),
  );
  await page.goto(origin + "scalability/index.html#slide-amdahl");
  await expect(page.locator(".web-demo-frame")).toHaveCount(1);
  await expect(page.locator(".demo-poster")).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.locator(".demo-status")).toContainText("could not start");
  await expect(page.locator(".demo-host")).toBeHidden();
  await expect(page.locator(".demo-poster")).toBeVisible();
  await expect(page.getByAltText("Regular illustration")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset experiment" }),
  ).toBeHidden();
});

test("an authored initialization error keeps the poster visible", async ({
  page,
}) => {
  await page.route("**/demos/amdahl.html*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: demoDocument(
        '<p>Broken demo</p><script>LectureDemo.onState(() => { throw new Error("Broken render"); });</script>',
        true,
      ),
    }),
  );
  await page.goto(origin + "scalability/index.html#slide-amdahl");
  await expect(page.locator(".demo-status")).toContainText("could not start");
  await expect(page.locator(".demo-poster")).toBeVisible();
  await expect(page.locator(".demo-host")).toBeHidden();
});

test("self-study reveals step locally, persist and expand for reading and print", async ({
  page,
}) => {
  await page.goto(origin + "scalability/index.html#slide-pressure");
  const section = page.locator("#slide-pressure");
  await expect(section.locator('[data-reveal-step="1"]')).toBeHidden();
  await section.getByRole("button", { name: "Next reveal" }).click();
  await expect(section.locator('[data-reveal-step="1"]')).toBeVisible();
  await expect(section.locator('[data-reveal-step="2"]')).toBeHidden();
  await page.reload();
  await expect(section.locator('[data-reveal-step="1"]')).toBeVisible();
  await expect(section.locator('[data-reveal-step="2"]')).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(section.locator('[data-reveal-step="2"]')).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.locator("#reading-mode").click();
  await expect(section.locator('[data-reveal-step="2"]')).toBeVisible();
  await expect(section.locator(".reveal-controls")).toBeHidden();
  await page.locator("#reading-mode").click();
  await section.getByRole("button", { name: "Previous reveal" }).click();
  await expect(section.locator('[data-reveal-step="1"]')).toBeHidden();
});
