import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";

test("checkpoint projects its build preview and next returns to slides", async ({
  page,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Preview.md";
  const definition = {
    version: 1,
    title: "Preview",
    start: "build",
    steps: [
      {
        id: "build",
        type: "build",
        title: "Build app",
        body: "Build it",
        next: "check",
      },
      {
        id: "check",
        type: "material",
        title: "Check app",
        previewOf: "build",
        next: "after",
      },
      {
        id: "after",
        type: "material",
        title: "Continue lecture",
        body: "Next topic",
      },
    ],
  };
  const { address, bridge, stop } = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Preview" }],
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
    await page.locator("#presentation-name").click();
    await page.locator("#presentation-load").click();
    await page.locator("#live-toggle").click();
    await page.locator("#graph-next").click();
    await expect(page.locator("#current-stage")).toContainText(
      "not available yet",
    );
    await page.locator("#graph-previous").click();
    await page.locator("#graph-build").click();
    bridge.state.messages = [
      { id: "preview", text: "Preview: http://127.0.0.1:54321/" },
    ];
    await page.locator("#graph-next").click();
    await expect(page.locator("#current-stage iframe")).toHaveAttribute(
      "src",
      "http://127.0.0.1:54321/",
    );
    await page.locator("#graph-next").click();
    await expect(page.locator("#current-stage")).toContainText("Next topic");
    await expect(page.locator("#current-stage iframe")).toHaveCount(0);
  } finally {
    await stop();
  }
});
