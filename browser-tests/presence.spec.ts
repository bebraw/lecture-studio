import { expect } from "@playwright/test";
import { parse } from "valibot";
import { audienceResponseSchema } from "../shared/audience-schemas.ts";
import { test } from "./audience-fixture.ts";

test("presence deduplicates browser tabs, excludes embeds, and expires without heartbeats", async ({
  audience,
  browser,
}) => {
  test.setTimeout(90000);
  const context = await browser.newContext();
  const first = await context.newPage();
  const count = async () =>
    parse(
      audienceResponseSchema,
      await (await fetch(new URL("/api/audience", audience.url))).json(),
    ).active;
  const unauthorized = await fetch(
    new URL("/presenter/presence", audience.url),
  );
  expect(unauthorized.status).toBe(401);
  const crossSite = await fetch(new URL("/api/presence", audience.url), {
    method: "POST",
    headers: { origin: "https://other.example" },
  });
  expect(crossSite.status).toBe(403);
  await first.goto(audience.url);
  await expect.poll(count).toBe(1);
  await expect(first.locator("#audience-followers")).toHaveText("1 following");
  const second = await context.newPage();
  await second.goto(audience.url);
  await expect(second.locator("#audience-followers")).toHaveText("1 following");
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "lecture_presence")?.httpOnly).toBe(
    true,
  );
  const embeddedContext = await browser.newContext();
  const embedded = await embeddedContext.newPage();
  // Same-origin wrapper avoids framing policy restrictions in this isolated test.
  await embedded.route("**/presence-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<iframe src="/"></iframe>',
    }),
  );
  await embedded.goto(new URL("/presence-test", audience.url).href);
  await expect(
    embedded.frameLocator("iframe").locator("#audience-followers"),
  ).toHaveText("1 following");
  expect(
    (await embeddedContext.cookies()).some(
      (c) => c.name === "lecture_presence",
    ),
  ).toBe(false);
  await context.close();
  await expect.poll(count, { timeout: 55000, intervals: [1000] }).toBe(0);
  await embeddedContext.close();
});
