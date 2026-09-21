import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { parse } from "valibot";
import { test } from "./audience-fixture.ts";
import { qaCredentialsSchema, qaPrivateSchema } from "../shared/qa.ts";

async function provision(
  audience: {
    url: string;
    request: (url: string, init: RequestInit) => Promise<Response>;
  },
  path: string,
  body: object,
) {
  const response = await audience.request(new URL(path, audience.url).href, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Fixture provisioning failed: ${response.status}`);
  return response;
}

test("hosted questions and mobile moderation work with no Studio and survive lecture resets", async ({
  audience,
  browser,
}) => {
  const credentials = parse(
    qaCredentialsSchema,
    await (
      await provision(audience, "/presenter/qa/ai-day", {
        action: "create",
        title: "AI Day 2026",
      })
    ).json(),
  );
  const publicContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    privateContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
  try {
    const attendee = await publicContext.newPage(),
      moderator = await privateContext.newPage();
    await attendee.goto(
      new URL(new URL(credentials.audienceUrl).pathname, audience.url).href,
    );
    await expect(
      attendee.getByRole("button", { name: "Send question" }),
    ).toBeDisabled();
    await moderator.goto(
      new URL(new URL(credentials.moderatorUrl).pathname, audience.url).href,
    );
    await expect(moderator.locator("#qa-login")).toBeVisible();
    await moderator.getByLabel("Moderator key").fill(credentials.moderatorKey);
    await moderator
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await moderator
      .getByRole("button", { name: "Open questions", exact: true })
      .click();
    await expect(
      attendee.getByRole("button", { name: "Send question" }),
    ).toBeEnabled();
    await attendee
      .getByLabel("Your question")
      .fill("How does cancellation recover? <script>alert(1)</script>");
    await attendee.getByLabel("Reply email").fill("attendee@example.org");
    await attendee.getByRole("button", { name: "Send question" }).click();
    await expect(attendee.locator("#submission-status")).toContainText(
      "sent privately",
    );
    await expect(moderator.locator(".question h2")).toContainText(
      "How does cancellation recover?",
    );
    await expect(moderator.locator(".question script")).toHaveCount(0);
    await moderator.getByText("Private reply address").click();
    await expect(moderator.locator(".question")).toContainText(
      "attendee@example.org",
    );
    const state = await publicContext.request.get(
      new URL("/q/ai-day/state", audience.url).href,
    );
    expect(await state.text()).not.toMatch(
      /attendee@|How does|moderatorKey|key_hash/,
    );
    expect(
      (
        await publicContext.request.get(
          new URL("/q/ai-day/manage", audience.url).href,
        )
      ).status(),
    ).toBe(401);
    const cookies = await privateContext.cookies();
    expect(
      cookies.find((cookie) => cookie.name === "qa_moderator"),
    ).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/q/ai-day/" });
    await audience.admin("/presenter/stage", {
      live: false,
      title: "Waiting",
      html: "",
    });
    await audience.admin("/presenter/reset-lecture");
    await expect(attendee.locator("#collection-status")).toHaveText(
      "Questions are open",
    );
    await moderator
      .getByRole("button", { name: "Follow-up", exact: true })
      .click();
    await moderator.getByLabel("Show questions").selectOption("reply-later");
    await expect(moderator.locator(".question")).toHaveCount(1);
    const downloading = moderator.waitForEvent("download");
    await moderator
      .getByRole("button", { name: "Download follow-ups (.md)" })
      .click();
    const download = await downloading;
    const text = await readFile((await download.path())!, "utf8");
    expect(text).toContain("attendee@example");
    expect(text).toContain("Private Q&A follow-ups");
    await moderator
      .getByRole("button", { name: "Close questions", exact: true })
      .click();
    await expect(
      attendee.getByRole("button", { name: "Send question" }),
    ).toBeDisabled();
    const before = parse(
      qaPrivateSchema,
      await (
        await privateContext.request.get(
          new URL("/q/ai-day/manage", audience.url).href,
        )
      ).json(),
    );
    await moderator
      .getByRole("button", { name: "Open questions", exact: true })
      .click();
    const after = parse(
      qaPrivateSchema,
      await (
        await privateContext.request.get(
          new URL("/q/ai-day/manage", audience.url).href,
        )
      ).json(),
    );
    expect(after.feedback.expires).toBe(before.feedback.expires);
    expect(after.feedback.items).toHaveLength(1);
    expect(
      (await new AxeBuilder({ page: moderator }).analyze()).violations,
    ).toEqual([]);
    expect(
      (await new AxeBuilder({ page: attendee }).analyze()).violations,
    ).toEqual([]);
    expect(
      await moderator.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await moderator.screenshot({
      path: "test-results/independent-qa-mobile.png",
      fullPage: true,
    });
    await moderator.getByRole("button", { name: "Sign out" }).click();
    await expect(moderator.locator("#qa-login")).toBeVisible();
    await expect(moderator.locator(".question")).toHaveCount(0);
  } finally {
    await publicContext.close();
    await privateContext.close();
  }
});

test("moderator keys, cookies and writes are scoped, revocable and origin protected", async ({
  audience,
  browser,
}) => {
  const a = parse(
    qaCredentialsSchema,
    await (
      await provision(audience, "/presenter/qa/session-a", {
        action: "create",
        title: "Session A",
      })
    ).json(),
  );
  await provision(audience, "/presenter/qa/session-b", {
    action: "create",
    title: "Session B",
  });
  const context = await browser.newContext();
  try {
    const origin = new URL(audience.url).origin;
    const api = (
      path: string,
      body: object,
      headers: Record<string, string> = {},
    ) =>
      context.request.post(new URL(path, audience.url).href, {
        data: body,
        headers: { origin, ...headers },
      });
    expect(
      (
        await api("/presenter/qa/unauthorized", {
          action: "create",
          title: "No",
        })
      ).status(),
    ).toBe(401);
    expect(
      (await api("/q/session-a/manage", { action: "open" })).status(),
    ).toBe(401);
    expect(
      (
        await api(
          "/q/session-a/login",
          { key: a.moderatorKey },
          { origin: "https://attacker.invalid" },
        )
      ).status(),
    ).toBe(403);
    expect(
      (await api("/q/session-b/login", { key: a.moderatorKey })).status(),
    ).toBe(401);
    expect(
      (await api("/q/session-a/login", { key: a.moderatorKey })).status(),
    ).toBe(200);
    const cookie = (await context.cookies()).find(
      (cookie) => cookie.name === "qa_moderator",
    )!;
    expect(
      (
        await api(
          "/q/session-b/manage",
          { action: "open" },
          { cookie: "qa_moderator=" + cookie.value },
        )
      ).status(),
    ).toBe(401);
    expect(
      (
        await api(
          "/q/session-a/manage",
          { action: "open" },
          { origin: "https://attacker.invalid" },
        )
      ).status(),
    ).toBe(403);
    expect(
      (await api("/q/session-a/manage", { action: "open" })).status(),
    ).toBe(200);
    const info: unknown = await (
      await context.request.get(
        new URL("/q/session-a/state", audience.url).href,
      )
    ).json();
    expect(JSON.stringify(info)).not.toContain(a.moderatorKey);
    const rotated = parse(
      qaCredentialsSchema,
      await (
        await provision(audience, "/presenter/qa/session-a", {
          action: "rotate",
          title: "Session A",
        })
      ).json(),
    );
    expect(
      (await api("/q/session-a/manage", { action: "close" })).status(),
    ).toBe(401);
    expect(
      (await api("/q/session-a/login", { key: a.moderatorKey })).status(),
    ).toBe(401);
    expect(
      (await api("/q/session-a/login", { key: rotated.moderatorKey })).status(),
    ).toBe(200);
    expect((await api("/q/session-a/logout", {})).status()).toBe(200);
    expect(
      (await api("/q/session-a/manage", { action: "close" })).status(),
    ).toBe(401);
  } finally {
    await context.close();
  }
});

test("hosted sessions retain submission and sign-in limits", async ({
  audience,
  browser,
}) => {
  const credentials = parse(
    qaCredentialsSchema,
    await (
      await provision(audience, "/presenter/qa/limits", {
        action: "create",
        title: "Limits",
      })
    ).json(),
  );
  const context = await browser.newContext();
  try {
    const origin = new URL(audience.url).origin;
    const post = (path: string, data: object) =>
      context.request.post(new URL(path, audience.url).href, {
        headers: { origin },
        data,
      });
    expect(
      (
        await post("/q/limits/login", { key: credentials.moderatorKey })
      ).status(),
    ).toBe(200);
    const opened = parse(
      qaPrivateSchema,
      await (await post("/q/limits/manage", { action: "open" })).json(),
    );
    const body = {
      round: opened.feedback.config!.round,
      text: "A valid question",
      email: "person@example.org",
    };
    expect(
      (
        await post("/q/limits/questions", { ...body, email: "invalid" })
      ).status(),
    ).toBe(400);
    expect((await post("/q/limits/questions", body)).status()).toBe(201);
    expect((await post("/q/limits/questions", body)).status()).toBe(429);
    await post("/q/limits/manage", { action: "close" });
    expect((await post("/q/limits/questions", body)).status()).toBe(409);
    for (let i = 0; i < 4; i++)
      expect((await post("/q/limits/login", { key: "wrong" })).status()).toBe(
        401,
      );
    expect((await post("/q/limits/login", { key: "wrong" })).status()).toBe(
      429,
    );
  } finally {
    await context.close();
  }
});
