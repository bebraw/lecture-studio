import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { test } from "./audience-fixture.ts";

async function accessible(page: Page, info: TestInfo, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await info.attach(name + "-axe", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
  expect(
    results.violations.map((violation) => ({
      rule: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        problem: node.failureSummary,
      })),
    })),
    name,
  ).toEqual([]);
}

test("desk, projector and presenter menus expose accessible controls and restore keyboard focus", async ({
  page,
  context,
}, info) => {
  const path = "Lectures/Web Development 2026/Presentations/Accessible.md";
  const definition = {
    version: 1,
    title: "Accessible lecture",
    start: "first",
    steps: [
      {
        id: "first",
        type: "material",
        title: "First slide",
        body: "Shared material",
        next: "second",
      },
      {
        id: "second",
        type: "question",
        title: "Second slide",
        body: "Who is the interface for?",
      },
    ],
  };
  const { studio, address } = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Accessible lecture" }],
      read: async () => ({
        sections: [
          {
            heading: "Presentation",
            body: "```json\n" + JSON.stringify(definition) + "\n```",
          },
        ],
      }),
      close: async () => {},
    },
  });
  try {
    await page.goto(address.deskUrl);
    await expect(page.locator("#presentation-name")).not.toHaveText("");
    await accessible(page, info, "desk-empty");
    const picker = page.locator("#presentation-name");
    await picker.focus();
    await page.keyboard.press("Enter");
    await expect(picker).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(picker).toBeFocused();
    await expect(picker).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(page.locator("#presentation-choice option")).toHaveText([
      "Accessible lecture",
    ]);
    await page.locator("#presentation-load").focus();
    await page.keyboard.press("Enter");
    await expect(picker).toBeFocused();
    await expect(
      page.locator('[data-step-id="first"]').first(),
    ).toHaveAttribute("aria-current", "step");
    await accessible(page, info, "desk-live-off");
    const live = page.locator("#live-toggle");
    await live.focus();
    await page.keyboard.press("Enter");
    await expect(live).toHaveAttribute("aria-pressed", "true");
    await accessible(page, info, "desk-live-on");
    await page.keyboard.press("ArrowRight");
    const second = page.locator('[data-step-id="second"]').first();
    await expect(second).toHaveAttribute("aria-current", "step");
    await expect(second).toBeFocused();
    const connections = page.locator("#connections > summary");
    await connections.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".connections-panel")).toBeVisible();
    await accessible(page, info, "connections");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(connections).toBeFocused();
    await expect(page.locator(".connections-panel")).toBeHidden();
    const responses = page.locator("#feedback-menu > summary");
    await responses.focus();
    await page.keyboard.press("Enter");
    await accessible(page, info, "response-controls");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(responses).toBeFocused();
    const stage = await context.newPage();
    await stage.goto(address.stageUrl);
    await expect(stage.locator("h1")).toBeVisible();
    await accessible(stage, info, "projector");
  } finally {
    await studio.server[Symbol.asyncDispose]();
  }
});

test("audience voting and feedback work with a keyboard and survive background updates", async ({
  audience,
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(audience.url);
  await accessible(page, info, "audience-waiting");
  await audience.admin("/presenter/stage", {
    live: true,
    title: "Accessible lecture",
    html: "<p>Shared material</p>",
  });
  await expect(
    page.getByRole("heading", { name: "Accessible lecture" }),
  ).toBeVisible();
  await accessible(page, info, "audience-stage");
  await audience.admin("/presenter/rooms/webdev-2026/open");
  const editorial = page.getByRole("radio", { name: "Editorial", exact: true });
  await editorial.focus();
  await page.keyboard.press("Space");
  await expect(editorial).toBeChecked();
  await accessible(page, info, "audience-poll");
  await audience.admin("/presenter/stage", {
    live: true,
    title: "Next material",
    html: "<p>The vote stays open</p>",
  });
  await page.waitForResponse(
    (response) => response.url().endsWith("/api/audience") && response.ok(),
  );
  await expect(editorial).toBeFocused();
  await expect(editorial).toBeChecked();
  await page.keyboard.press("Tab");
  const vote = page.getByRole("button", { name: "Vote", exact: true });
  await expect(vote).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Vote saved · change vote" }),
  ).toBeVisible();
  await audience.admin("/presenter/rooms/webdev-2026/lock");
  await audience.admin("/presenter/feedback", {
    action: "start",
    mode: "questions",
    prompt: "Any questions?",
  });
  const summary = page.getByText("Ask a question", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const question = page.getByRole("textbox", { name: "Any questions?" });
  await expect(question).toBeFocused();
  await page.keyboard.type("Can I use the keyboard?");
  await accessible(page, info, "audience-feedback");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Send privately" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Sent privately. The lecturer chooses what to show."),
  ).toBeVisible();
});
