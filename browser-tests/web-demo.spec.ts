import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fixture } from "../tests/fixture.ts";

test("Obsidian HTML demos synchronize lecturer controls with an isolated projector", async ({
  context,
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
        demo: "./amdahl.html",
        body: "Sequential work bounds speedup.",
      },
      { id: "next", type: "material", title: "Discussion" },
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
    readHtml: async (file: string) => {
      expect(file).toBe("Lectures/Test/Presentations/amdahl.html");
      return html;
    },
    close: async () => {},
  };
  const { stop, address } = await fixture({ library });
  try {
    const desk = await context.newPage();
    const stage = await context.newPage();
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    const controller = desk.frameLocator("#web-demo-controller iframe");
    await expect(controller.locator("#speedup")).toHaveText("2.50×");
    await controller.locator("#workers").fill("8");
    await expect(controller.locator("#speedup")).toHaveText("3.33×");
    await expect(stage.locator(".web-demo-frame")).toHaveCount(0);
    await desk.locator("#live-toggle").click();
    const projection = stage.frameLocator(".web-demo-frame");
    await expect(projection.locator("#speedup")).toHaveText("3.33×");
    await expect(projection.locator("#controls")).toBeHidden();
    await controller.locator("#workers").fill("16");
    await expect(projection.locator("#speedup")).toHaveText("4.00×");
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
    await desk.locator("#graph-next").click();
    await expect(desk.locator("#web-demo-controller")).toBeHidden();
    await expect(stage.locator("h1")).toHaveText("Discussion");
    await desk.locator("#graph-previous").click();
    await expect(controller.locator("#speedup")).toHaveText("4.00×");
    await expect(projection.locator("#speedup")).toHaveText("4.00×");
    await desk.locator("#web-demo-controller > button").click();
    await expect(projection.locator("#speedup")).toHaveText("2.50×");
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
