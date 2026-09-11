import { expect } from "@playwright/test";
import * as v from "valibot";
import { feedbackSchema } from "../shared/schemas.ts";
import { test, rooms } from "./audience-fixture.ts";

const roomSchema = v.object({
  status: v.picklist(["open", "locked"]),
  totalVotes: v.number(),
  choices: v.array(v.object({ id: v.string(), votes: v.number() })),
});

test.describe("Native forms", () => {
  test.use({ javaScriptEnabled: false });
  for (const room of rooms) {
    test(`${room}: native voting, authorization, replacement and lecture reset`, async ({
      audience,
      page,
    }) => {
      const endpoint = `/presenter/rooms/${room}/`;
      const admin = async (operation: string, session?: string) =>
        v.parse(
          roomSchema,
          await (
            await audience.admin(
              endpoint + operation,
              undefined,
              session ? { "X-Lecture-Session": session } : {},
            )
          ).json(),
        );
      const send = (
        choice: string,
        origin = new URL(audience.url).origin,
        cookie = "",
      ) =>
        fetch(new URL(`/rooms/${room}`, audience.url), {
          method: "POST",
          redirect: "manual",
          headers: {
            origin,
            cookie,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ choice }),
        });
      const seeded = await admin("seed");
      const first = seeded.choices[0]?.id;
      const second = seeded.choices[1]?.id;
      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      if (!first || !second) throw new Error("Fixture requires two choices");
      expect(
        (
          await fetch(new URL(endpoint + "open", audience.url), {
            method: "POST",
          })
        ).status,
      ).toBe(401);
      expect(
        (await fetch(new URL("/rooms/not-allowed", audience.url))).status,
      ).toBe(404);
      expect((await send(first)).status).toBe(409);
      await admin("open-session", "first-lecture");
      expect((await send(first, "https://unrelated.invalid")).status).toBe(403);
      expect((await send("invalid-option")).status).toBe(400);
      const vote = await send(first);
      expect(vote.status).toBe(303);
      const cookie = vote.headers.get("set-cookie")?.split(";")[0];
      expect(cookie).toBeTruthy();
      expect((await send(second, undefined, cookie)).status).toBe(303);
      const result = await admin("lock");
      expect(result.totalVotes).toBe(1);
      expect(result.choices.find((choice) => choice.id === first)?.votes).toBe(
        0,
      );
      expect(result.choices.find((choice) => choice.id === second)?.votes).toBe(
        1,
      );
      expect(await admin("seed")).toEqual(result);
      expect((await admin("open-session", "first-lecture")).totalVotes).toBe(1);
      expect((await admin("open-session", "first-lecture")).totalVotes).toBe(1);
      expect((await admin("open-session", "second-lecture")).totalVotes).toBe(
        0,
      );

      await page.goto(new URL(`/rooms/${room}`, audience.url).href);
      await page.getByRole("radio").first().check();
      await Promise.all([
        page.waitForURL(audience.url),
        page.getByRole("button", { name: "Vote", exact: true }).click(),
      ]);
      expect((await admin("lock")).totalVotes).toBe(1);
    });
  }
});

test("students follow the stage without losing their poll selection", async ({
  audience,
  page,
}) => {
  const publish = (title: string, live = true) =>
    audience.admin("/presenter/stage", {
      live,
      title,
      html: "<p>Shared slide content</p>",
      mode: "material",
      act: "past",
      version: title,
      theme: { headingFont: "Verdana, sans-serif" },
      notes: "PRIVATE",
    });
  expect(
    (
      await fetch(new URL("/presenter/stage", audience.url), {
        method: "POST",
        body: "{}",
      })
    ).status,
  ).toBe(401);
  await publish("A shared stage");
  expect(
    await (await fetch(new URL("/api/audience", audience.url))).text(),
  ).not.toContain("PRIVATE");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(audience.url);
  await expect(
    page.getByRole("heading", { name: "A shared stage" }),
  ).toBeVisible();
  await audience.admin("/presenter/rooms/webdev-2026/open");
  await expect(publish("Stopped", false)).rejects.toThrow("409");
  const choice = page.getByLabel("Editorial", { exact: true });
  await choice.check();
  await publish("The projector moved on");
  // Wait for a complete audience refresh before checking retained form state.
  await page.waitForResponse(
    (response) => response.url().endsWith("/api/audience") && response.ok(),
  );
  await expect(choice).toBeChecked();
  await page.getByRole("button", { name: "Vote", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vote saved · change vote" }),
  ).toBeVisible();
  expect(page.url()).toBe(audience.url);
  await audience.admin("/presenter/rooms/webdev-2026/lock");
  await expect(
    page.getByRole("heading", { name: "The projector moved on" }),
  ).toBeVisible();
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.locator("h1")).toHaveCSS(
    "font-family",
    "Verdana, sans-serif",
  );
  await publish("Stopped", false);
  expect(
    await (await fetch(new URL("/api/audience", audience.url))).json(),
  ).toEqual({ stage: null, poll: null });
  await expect(
    page.getByRole("heading", { name: "Waiting for the lecturer" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Waiting for the lecturer" }),
  ).toBeVisible();
  await publish("Broadcast resumed");
  await expect(
    page.getByRole("heading", { name: "Broadcast resumed" }),
  ).toBeVisible();
});

test("feedback remains private and enforces moderation, origin and submission limits", async ({
  audience,
  page,
}) => {
  const admin = async (body: object) =>
    v.parse(
      feedbackSchema,
      await (await audience.admin("/presenter/feedback", body)).json(),
    );
  const publish = (live: boolean) =>
    audience.admin("/presenter/stage", {
      live,
      title: "Test slide",
      html: "",
      mode: "material",
      version: "feedback-test",
    });
  await publish(true);
  expect(
    (await fetch(new URL("/presenter/feedback", audience.url))).status,
  ).toBe(401);
  let snapshot = await admin({
    action: "start",
    mode: "questions",
    prompt: "Any questions?",
  });
  const submit = (text: string, extra: Record<string, string> = {}) =>
    fetch(new URL("/api/feedback", audience.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(audience.url).origin,
        ...extra,
      },
      body: JSON.stringify({ round: snapshot.config?.round, text }),
    });
  expect(
    (await submit("Cross origin", { origin: "https://evil.invalid" })).status,
  ).toBe(403);
  expect((await submit("x".repeat(401))).status).toBe(400);
  const response = await submit("PRIVATE question <script>alert(1)</script>");
  expect(response.status).toBe(201);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Missing feedback cookie");
  expect((await submit("Too soon", { cookie })).status).toBe(429);
  for (const path of ["/api/feedback", "/api/audience"])
    expect(await (await fetch(new URL(path, audience.url))).text()).not.toMatch(
      /PRIVATE|script/,
    );
  // Closing retains the moderation queue; starting a collection clears it.
  snapshot = await admin({ action: "close" });
  expect(snapshot.items[0]?.status).toBe("pending");
  await admin({ action: "done", id: snapshot.items[0]?.id });
  await admin({ action: "start", mode: "questions", prompt: "Any questions?" });
  await page.goto(audience.url);
  await page.getByText("Ask a question", { exact: true }).click();
  await page.getByLabel("Any questions?").fill("A browser question");
  await page.getByRole("button", { name: "Send privately" }).click();
  await expect(
    page.getByText("Sent privately. The lecturer chooses what to show."),
  ).toBeVisible();
  await admin({ action: "close" });
  await expect(page.locator("#student-feedback")).toBeHidden();
  snapshot = await admin({
    action: "start",
    mode: "words",
    prompt: "Describe the web",
  });
  await expect(page.getByText("Add words", { exact: true })).toBeVisible();
  expect((await submit("one two three four")).status).toBe(400);
  expect((await submit("hypermedia")).status).toBe(201);
  snapshot = await admin({ action: "close" });
  expect(snapshot.items).toHaveLength(1);
  await admin({ action: "approve", id: snapshot.items[0]?.id });
  expect(
    await (await fetch(new URL("/api/audience", audience.url))).text(),
  ).not.toContain("hypermedia");
  await publish(false);
  expect((await submit("late")).status).toBe(409);
  expect(
    await (await fetch(new URL("/api/feedback", audience.url))).json(),
  ).toMatchObject({ open: false });
  await expect(page.locator("#student-feedback")).toBeHidden();
});
