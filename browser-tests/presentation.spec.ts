import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
test("Obsidian snapshot uses a flat list and consecutive arrow navigation", async ({
  context,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Test.md";
  const definition = {
    version: 1,
    title: "Independent presentation",
    start: "title",
    theme: {},
    steps: [
      { id: "title", type: "title", title: "Snapshot title", next: "question" },
      {
        id: "question",
        type: "question",
        title: "Audience question",
        related: ["aside"],
      },
      {
        id: "aside",
        type: "material",
        title: "Definition detour",
        body: "A useful definition.",
        notes: "PRIVATE FACILITATION",
      },
    ],
  };
  // Projection titles now share the body font; exercise that theme override too.
  definition.theme = {
    headingFont: "Verdana, sans-serif",
    bodyFont: "Verdana, sans-serif",
    muted: "#555555",
  };
  const library = {
    status: "Disconnected",
    async list() {
      this.status = "Connected · fixture";
      return [{ path, label: "Test" }];
    },
    read: async () => ({
      sections: [
        {
          heading: "Presentation",
          body: "```json\n" + JSON.stringify(definition) + "\n```",
        },
      ],
    }),
    close: async () => {},
  };
  const { stop, address, bridge } = await fixture({ library });
  try {
    const desk = await context.newPage(),
      stage = await context.newPage();
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await expect(desk.locator(".builder")).toBeHidden();
    await expect(desk.locator(".material-column")).toBeHidden();
    await expect(desk.locator("#presentation-choice")).toBeHidden();
    await expect(desk.locator("#presentations-list")).toHaveText(
      "Refresh list",
    );
    await expect(desk.locator("#presentation-unload")).toHaveCount(0);
    await expect(desk.locator("body")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(desk.locator(".builder")).toHaveCSS(
      "background-color",
      "rgb(245, 245, 245)",
    );
    await expect(stage.locator("body")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(stage.locator("#student-link")).toHaveText(
      "live.scalableweb.dev",
    );
    await expect(stage.locator("#student-link")).toHaveAttribute(
      "href",
      "https://live.scalableweb.dev",
    );
    await expect(desk.locator("#presentation-outline")).toBeHidden();
    await expect(desk.locator("body")).not.toContainText(
      "Load an Obsidian presentation to see",
    );
    await expect(desk.locator("#presentation-setup")).toBeHidden();
    await desk.locator("#presentation-name").click();
    await expect(desk.locator("#presentation-choice option")).toHaveText([
      "Test",
    ]);
    await expect(desk.locator("#codex-signal")).toHaveAttribute(
      "aria-label",
      "Codex: ready",
    );
    expect(bridge.lastPrompt).toBeUndefined();
    await expect(desk.locator("#graph-presentation")).toBeHidden();
    await desk.locator("#presentation-load").click();
    await expect(desk.locator("#presentation-setup")).toBeHidden();
    await expect(desk.locator("#live-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(desk.locator("#session-menu")).toHaveCount(0);
    await expect(
      desk.locator("#presentation-detail-content #model"),
    ).toHaveCount(0);
    await expect(desk.locator("#connections #model")).toHaveCount(1);
    await expect(desk.locator("#connections #activity")).toHaveCount(1);
    await expect(desk.locator("#connections #interrupt")).toHaveCount(1);
    await expect(desk.locator("#graph-title")).toHaveText("Snapshot title");
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Snapshot title",
    );
    await expect(desk.locator(".preview-slide-position")).toHaveText("1/3");
    await expect(desk.locator(".preview-slide-progress")).toHaveAttribute(
      "value",
      String(1 / 3),
    );
    await expect(desk.locator("#current-stage")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    const prepareHeadingSize = await desk
      .locator("#current-stage h1")
      .evaluate((el) => getComputedStyle(el).fontSize);
    await expect(
      desk.locator("#graph-presentation>.button-row #live-progress"),
    ).toBeEmpty();
    const rhythm = await desk.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        top: box("#current-stage").top - box(".topbar").bottom,
        controls:
          box("#graph-presentation>.button-row").top -
          box("#current-stage").bottom,
      };
    });
    expect(rhythm.top).toBe(12);
    expect(rhythm.controls).toBe(8);
    await expect(desk.locator("#codex-signal")).toHaveAttribute(
      "aria-label",
      "Codex: ready",
    );
    await desk.locator("#presentation-outline").evaluate((el) => {
      el.style.maxHeight = "45px";
    });
    const pagePosition = await desk.evaluate(() => window.scrollY);
    const previewPosition = await desk.locator("#current-stage").boundingBox();
    await desk.keyboard.press("ArrowRight");
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Audience question",
    );
    await expect(
      desk.locator('#presentation-outline [data-step-id="question"]'),
    ).toBeFocused();
    await expect
      .poll(() =>
        desk.locator("#presentation-outline").evaluate((el) => el.scrollTop),
      )
      .toBeGreaterThan(0);
    const selectedVisible = () =>
      desk.locator("#presentation-outline").evaluate((el) => {
        const item = el
            .querySelector('[aria-current="step"]')!
            .getBoundingClientRect(),
          box = el.getBoundingClientRect();
        return item.top >= box.top - 1 && item.bottom <= box.bottom + 1;
      });
    await expect.poll(selectedVisible).toBe(true);
    expect(await desk.evaluate(() => window.scrollY)).toBe(pagePosition);
    expect((await desk.locator("#current-stage").boundingBox())!.y).toBe(
      previewPosition!.y,
    );
    await expect(stage.locator("h1")).toHaveText("Waiting for the lecturer");
    await desk.keyboard.press("ArrowLeft");
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Snapshot title",
    );
    await expect.poll(selectedVisible).toBe(true);
    await desk.locator("#presentation-outline").evaluate((el) => {
      el.style.removeProperty("max-height");
    });
    await expect(
      desk.locator('#presentation-outline [data-step-id="title"]'),
    ).toBeFocused();
    await desk.locator("#connections>summary").focus();
    await desk.keyboard.press("ArrowRight");
    await expect(desk.locator("#connections>summary")).toBeFocused();
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Snapshot title",
    );
    expect(
      (await desk.locator(".topbar").boundingBox())!.height,
    ).toBeLessThanOrEqual(60);
    await expect(desk.locator("#presentation-outline")).not.toContainText(
      "Optional detours",
    );
    await expect(
      desk.locator('#presentation-outline [data-step-id="aside"]'),
    ).toHaveText("3. Definition detour");
    await expect(
      desk.locator('#presentation-outline [data-step-id="aside"]'),
    ).toBeVisible();
    await expect(desk.locator(".plot")).toBeHidden();
    const width = await desk
      .locator("#presentation-outline")
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(290);
    await expect(stage.locator("h1")).toHaveText("Waiting for the lecturer");
    const outlineBox = await desk
      .locator("#presentation-outline")
      .boundingBox();
    const previewBox = await desk.locator("#current-stage").boundingBox();
    const questionButton = desk.locator(
      '#presentation-outline [data-step-id="question"]',
    );
    await questionButton.click();
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Audience question",
    );
    await expect(questionButton).toBeFocused();
    await expect(
      desk.locator('#presentation-outline [data-step-id="aside"]'),
    ).toBeVisible();
    expect((await desk.locator("#presentation-outline").boundingBox())!.y).toBe(
      outlineBox!.y,
    );
    expect((await desk.locator("#current-stage").boundingBox())!.height).toBe(
      previewBox!.height,
    );
    await desk.locator('#presentation-outline [data-step-id="title"]').click();
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Snapshot title",
    );
    expect(definition.steps[0]).toBeDefined();
    definition.steps[0]!.title = "Edited in vault";
    library.status = "Unavailable";
    await desk.locator("#live-toggle").click();
    await expect(desk.locator("#presentation-name")).toBeDisabled();
    await expect(desk.locator("#current-stage h1")).toHaveCSS(
      "font-size",
      prepareHeadingSize,
    );
    await expect(desk.locator(".builder")).toBeHidden();
    await expect(desk.locator(".material-column")).toBeHidden();
    await expect(desk.locator("#presentation-details")).toHaveAttribute(
      "open",
      "",
    );
    await expect(desk.locator("#presentation-details>summary")).toHaveText(
      "Notes",
    );
    await expect(desk.locator("#build-output")).not.toHaveAttribute("open", "");
    await expect(
      desk.locator("#graph-presentation #current-stage"),
    ).toBeVisible();
    await expect(stage.locator("h1")).toHaveText("Snapshot title");
    await expect(stage.locator("#slide-number")).toHaveText("1/3");
    await expect(stage.locator("#slide-progress")).toHaveJSProperty(
      "value",
      1 / 3,
    );
    await expect(stage.locator("#build-signal")).toBeHidden();
    bridge.state.status = "working";
    await expect(stage.locator("#build-signal")).toBeVisible();
    bridge.state.status = "waiting";
    await expect(stage.locator("#build-signal")).toContainText("paused");
    bridge.state.status = "ready";
    await expect(stage.locator("#build-signal")).toBeHidden();
    await expect(stage.locator("h1")).toHaveCSS(
      "font-family",
      "Verdana, sans-serif",
    );
    await expect(desk.locator("#current-stage h1")).toHaveCSS(
      "font-family",
      "Verdana, sans-serif",
    );
    await expect(desk.locator("#graph-presentation")).toBeVisible();
    await desk.locator("#graph-next").click();
    await expect(stage.locator("h1")).toHaveText("Audience question");
    await desk.keyboard.press("ArrowRight");
    await expect(stage.locator("h1")).toHaveText("Definition detour");
    await expect(stage.locator("#slide-number")).toHaveText("3/3");
    await expect(stage.locator("#slide-progress")).toHaveJSProperty("value", 1);
    await expect(stage.locator("#student-link")).toBeVisible();
    await expect(stage.locator("body")).not.toContainText(
      "PRIVATE FACILITATION",
    );
    await expect(stage.locator("#build-signal")).toBeHidden();
    await expect(desk.locator("#graph-return")).toBeHidden();
    await desk.keyboard.press("ArrowLeft");
    await expect(stage.locator("h1")).toHaveText("Audience question");
    await expect(stage.locator("#slide-number")).toHaveText("2/3");
    await desk.screenshot({
      path: "test-results/presentation-consolidated.png",
      fullPage: true,
    });
    await desk.locator("#live-toggle").click();
    await desk
      .locator("#presentation-outline button")
      .filter({ hasText: "Snapshot title" })
      .click();
    await expect(desk.locator("#graph-title")).toHaveText("Snapshot title");
    await expect(desk.locator("#current-stage h1")).toHaveText(
      "Snapshot title",
    );
    await expect(desk.locator("#graph-next")).toHaveText("Next →");
    await expect(stage.locator("h1")).toHaveText("Waiting for the lecturer");
    await expect(desk.locator("#graph-show")).toHaveCount(0);
    await desk.locator("#live-toggle").click();
    await expect(stage.locator("h1")).toHaveText("Snapshot title");
    await expect(desk.locator("#presentation-outline")).toBeVisible();
    await desk
      .locator('#presentation-outline [data-step-id="question"]')
      .click();
    await expect(stage.locator("h1")).toHaveText("Audience question");
  } finally {
    await stop();
  }
});
