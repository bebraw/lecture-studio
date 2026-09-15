import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { fixture } from "../tests/fixture.ts";

test("live room embeds on stage, submits independently of the landing page, and keeps state during updates", async ({
  audience,
  page,
}) => {
  const studio = await fixture();
  try {
    await audience.admin("/presenter/rooms/webdev-2026/open");
    const url = new URL("/rooms/webdev-2026", audience.url).href;
    const roomResponse = await page.request.get(url);
    expect(roomResponse.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*",
    );
    const rootResponse = await page.request.get(audience.url);
    expect(rootResponse.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    const response = await page.request.post(
      studio.address.origin + "/api/show-preview",
      {
        headers: {
          Origin: studio.address.origin,
          Authorization: "Bearer " + studio.address.deskToken,
        },
        data: { url },
      },
    );
    expect(response.ok()).toBe(true);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(studio.address.stageUrl);
    const app = page.frameLocator('iframe[title="Live lecture application"]');
    await expect(app.locator("#room-results")).toBeVisible();
    // A redirect to the audience landing page must not be needed to save a vote.
    await page.route(audience.url, (route) =>
      route.fulfill({ status: 500, body: "Landing page unavailable" }),
    );
    await app.getByRole("radio").nth(1).check();
    await app.getByRole("button", { name: "Vote", exact: true }).click();
    await expect(app.getByRole("status")).toContainText("Choice saved");
    await expect(app.locator("#room-aggregate")).toContainText("1 total votes");
    await app.getByRole("radio").first().check();
    await app
      .locator("#room-results")
      .evaluate((element) => (element.dataset.previewInstance = "retained"));
    studio.bridge.state.status = "working";
    await expect(page.locator("#build-signal")).toBeVisible();
    await audience.admin("/presenter/rooms/webdev-2026/lock");
    await expect(app.locator("#room-aggregate")).toContainText(
      "Voting is locked",
    );
    await expect(app.getByRole("radio").first()).toBeChecked();
    await expect(app.locator("#room-results")).toHaveAttribute(
      "data-preview-instance",
      "retained",
    );
    expect(
      errors.filter((error) =>
        /frame-ancestors|ERR_BLOCKED_BY_RESPONSE/.test(error),
      ),
    ).toEqual([]);
  } finally {
    await studio.stop();
  }
});
