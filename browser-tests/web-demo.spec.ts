import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { stringValue } from "../shared/errors.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";
import { readFile } from "node:fs/promises";
import { fixture } from "../tests/fixture.ts";

test("public demo endpoints require presenter authorization and bounded valid publications", async ({
  audience,
}) => {
  const id = crypto.randomUUID();
  const body = {
    live: true,
    title: "Demo",
    html: "",
    webDemo: { id, url: "/audience-demo/" + id, state: "{}" },
    demoHtml: "<p>Public demo</p>",
  };
  const endpoint = new URL("/presenter/stage", audience.url).href;
  const publish = (value: object) =>
    audience.request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
  expect(
    (await fetch(endpoint, { method: "POST", body: JSON.stringify(body) }))
      .status,
  ).toBe(401);
  for (const value of [
    { ...body, demoHtml: "a".repeat(250001) },
    { ...body, webDemo: { ...body.webDemo, state: "[]" } },
    {
      ...body,
      webDemo: {
        ...body.webDemo,
        state: JSON.stringify({ text: "a".repeat(16000) }),
      },
    },
    { ...body, webDemo: { ...body.webDemo, url: "https://example.com/" } },
    { ...body, live: false },
    { ...body, blank: true },
  ])
    expect((await publish(value)).status).toBe(400);
  expect(
    (await publish({ ...body, demoHtml: "a".repeat(1700001) })).status,
  ).toBe(413);
  expect((await publish(body)).status).toBe(200);
  const url = new URL(body.webDemo.url + "?role=controller", audience.url);
  const response = await fetch(url);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('const role="viewer"');
  expect((await fetch(url, { method: "POST" })).status).toBe(405);
  expect(
    (
      await fetch(
        new URL("/audience-demo/" + crypto.randomUUID(), audience.url),
      )
    ).status,
  ).toBe(404);
  expect(
    (await publish({ live: true, blank: true, title: "Hidden", html: "" }))
      .status,
  ).toBe(200);
  expect((await fetch(url)).status).toBe(404);
  expect((await publish({ ...body, demoHtml: undefined })).status).toBe(409);
});

test("Obsidian HTML demos mirror lecturer state to isolated projector and public viewers", async ({
  context,
  audience,
}) => {
  const html = await readFile(
    new URL("../examples/demos/amdahl.html", import.meta.url),
    "utf8",
  );
  const path = "Lectures/Test/Presentations/Laws.md";
  const definition = {
    version: 1,
    title: "Laws",
    start: "demo",
    steps: [
      {
        id: "demo",
        type: "material",
        title: "Amdahl",
        notes: "PRIVATE_DEMO_NOTES",
        demo: "./amdahl.html",
        demoPoster: "./figure.svg",
        body: "Sequential work bounds speedup.",
      },
      {
        id: "next",
        type: "material",
        title: "Discussion",
        body: "![Course progression](./figure.svg)",
      },
    ],
  };
  const library = {
    status: "Connected · fixture",
    list: async () => [{ path, label: "Laws" }],
    read: async () => ({
      sections: [
        {
          heading: "Presentation",
          body: "```json\n" + JSON.stringify(definition) + "\n```",
        },
      ],
    }),
    readImage: async () =>
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="green"/></svg>',
      ),
    readHtml: async (file: string) => {
      expect(file).toBe("Lectures/Test/Presentations/amdahl.html");
      return html;
    },
    close: async () => {},
  };
  const publications: Record<string, unknown>[] = [];
  const poll = new AudiencePoll({
    origin: "https://live.scalableweb.dev",
    token: "fixture",
    fetcher: async (url, init) => {
      if (new URL(url).pathname === "/presenter/stage")
        publications.push(
          JSON.parse(stringValue(init.body, "publication body")) as Record<
            string,
            unknown
          >,
        );
      return audience.request(
        new URL(new URL(url).pathname, audience.url).href,
        init,
      );
    },
  });
  const { stop, address } = await fixture({ library, poll });
  try {
    const desk = await context.newPage();
    const stage = await context.newPage();
    const student = await context.newPage();
    await student.goto(audience.url);
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    const controller = desk.frameLocator("#web-demo-controller iframe");
    await expect(controller.locator("#speedup")).toHaveText("2.50×");
    await controller.locator("#workers").fill("8");
    await expect(controller.locator("#speedup")).toHaveText("3.33×");
    await expect(stage.locator(".web-demo-frame")).toHaveCount(0);
    expect(publications.every((value) => value.demoHtml === undefined)).toBe(
      true,
    );
    await desk.locator("#live-toggle").click();
    const projection = stage.frameLocator(".web-demo-frame");
    await expect(projection.locator("#speedup")).toHaveText("3.33×");
    await expect(projection.locator("#controls")).toBeHidden();
    const mirrored = student.frameLocator(".web-demo-frame");
    await expect(mirrored.locator("#speedup")).toHaveText("3.33×");
    await expect(mirrored.locator("#controls")).toBeHidden();
    const demoUrl = await student
      .locator(".web-demo-frame")
      .getAttribute("src");
    expect(demoUrl).toMatch(/^\/audience-demo\//);
    const frame = await student.locator(".web-demo-frame").elementHandle();
    const response = await fetch(new URL(demoUrl!, audience.url));
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox allow-scripts",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    const snapshot = await (
      await fetch(new URL("/api/audience", audience.url))
    ).text();
    expect(snapshot).not.toContain("PRIVATE_DEMO_NOTES");
    expect(snapshot).not.toContain("demoHtml");
    await controller.locator("#workers").fill("16");
    await expect(projection.locator("#speedup")).toHaveText("4.00×");
    await expect(mirrored.locator("#speedup")).toHaveText("4.00×");
    expect(await frame!.evaluate((node) => node.isConnected)).toBe(true);
    expect(
      publications.filter((value) => value.demoHtml !== undefined),
    ).toHaveLength(1);
    await projection
      .locator("body")
      .evaluate(() =>
        parent.postMessage(
          { type: "lecture-demo:update", state: '{"workers":1}' },
          "*",
        ),
      );
    await expect(controller.locator("#speedup")).toHaveText("4.00×");
    expect(
      await controller.locator("body").evaluate(async () => {
        try {
          await fetch("/api/desk");
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    expect(
      await controller.locator("body").evaluate(() => {
        try {
          return parent.document.body === null;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    await mirrored
      .locator("body")
      .evaluate(() =>
        parent.postMessage(
          { type: "lecture-demo:update", state: '{"workers":1}' },
          "*",
        ),
      );
    await expect(controller.locator("#speedup")).toHaveText("4.00×");
    expect(
      await mirrored.locator("body").evaluate(async () => {
        try {
          await fetch("/api/audience");
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    await desk.locator("#graph-next").click();
    await expect(student.locator("h1")).toHaveText("Discussion");
    expect((await fetch(new URL(demoUrl!, audience.url))).status).toBe(404);
    await expect(desk.locator("#web-demo-controller")).toBeHidden();
    await expect(stage.locator("h1")).toHaveText("Discussion");
    await expect(stage.getByAltText("Course progression")).toBeVisible();
    expect(
      await stage
        .getByAltText("Course progression")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBe(200);
    const reading = await context.newPage();
    await reading.goto(new URL("/slides", address.deskUrl).href);
    await expect(reading.getByAltText("Demo preview")).toBeVisible();
    await desk.locator("#graph-previous").click();
    await expect(controller.locator("#speedup")).toHaveText("4.00×");
    await expect(projection.locator("#speedup")).toHaveText("4.00×");
    await desk.locator("#web-demo-controller > button").click();
    await expect(projection.locator("#speedup")).toHaveText("2.50×");
    await expect(mirrored.locator("#speedup")).toHaveText("2.50×");
    const late = await context.newPage();
    await late.goto(audience.url);
    await expect(
      late.frameLocator(".web-demo-frame").locator("#speedup"),
    ).toHaveText("2.50×");
    await desk.locator("#live-toggle").click();
    await expect(student.locator(".web-demo-frame")).toHaveCount(0);
    expect((await fetch(new URL(demoUrl!, audience.url))).status).toBe(404);
    await controller.locator("#workers").fill("1");
    await desk.locator("#live-toggle").click();
    await expect(mirrored.locator("#speedup")).toHaveText("1.00×");
    await stage.screenshot({
      path: "/private/tmp/lecture-web-demo-stage.png",
      fullPage: true,
    });
    await desk.screenshot({
      path: "/private/tmp/lecture-web-demo-desk.png",
      fullPage: true,
    });
  } finally {
    await stop();
  }
});
