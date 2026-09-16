import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { createServer } from "node:http";
import { previewFraming } from "../shared/preview-framing.ts";

test("checkpoint projects its build preview and next returns to slides", async ({
  page,
}) => {
  const app = createServer((req, res) => {
    const response = previewFraming(
      new Request(`http://${req.headers.host}/`),
      new Response(null, {
        headers: {
          "content-type": "text/html",
          "content-security-policy":
            "default-src 'self'; frame-ancestors 'none'",
          "x-frame-options": "DENY",
        },
      }),
    );
    res.writeHead(200, Object.fromEntries(response.headers));
    res.end("<!doctype html><h1>Working lecture app</h1>");
  });
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const appAddress = app.address();
  if (!appAddress || typeof appAddress === "string")
    throw new Error("No app port");
  const appUrl = `http://127.0.0.1:${appAddress.port}/`;
  const path = "Lectures/Web Development 2026/Presentations/Preview.md";
  const definition = {
    version: 1,
    title: "Preview",
    start: "build-document",
    steps: [
      {
        id: "build-document",
        type: "build",
        title: "Build app",
        body: "Build it",
        next: "check",
      },
      {
        id: "check",
        type: "material",
        title: "Check app",
        previewOf: "build-document",
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
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveAttribute("src", /\/teaching\/checkpoint\/build-document$/);
    await page.locator("#graph-previous").click();
    await page.locator("#graph-build").click();
    bridge.state.messages = [{ id: "preview", text: "Preview: " + appUrl }];
    await page.locator("#graph-next").click();
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveAttribute("src", appUrl);
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .frameLocator("#stage-content iframe")
        .getByRole("heading", { name: "Working lecture app" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Show prepared demo", exact: true })
      .click();
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveAttribute("src", /\/teaching\/checkpoint\/build-document$/);
    expect(bridge.state.turnId).toBe("fake-turn");
    await page
      .getByRole("button", { name: "Show generated demo", exact: true })
      .click();
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveAttribute("src", appUrl);
    await page
      .getByRole("button", { name: "Show prepared demo", exact: true })
      .click();
    await page.locator("#graph-next").click();
    await expect(
      page.frameLocator("#current-stage > iframe").locator("body"),
    ).toContainText("Next topic");
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveCount(0);
    await page.locator("#graph-previous").click();
    await expect(
      page
        .frameLocator("#current-stage > iframe")
        .locator("#stage-content iframe"),
    ).toHaveAttribute("src", /\/teaching\/checkpoint\/build-document$/);
  } finally {
    await stop();
    await new Promise<void>((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
