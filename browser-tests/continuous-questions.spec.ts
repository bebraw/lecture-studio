import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";

test("questions remain available during word clouds and resume across Live off/on", async ({
  audience,
  page,
}) => {
  const publish = (live: boolean) =>
    audience.admin("/presenter/stage", {
      live,
      title: "A slide",
      html: "",
      mode: "material",
      version: "questions",
    });
  await publish(true);
  await audience.admin("/presenter/feedback", {
    action: "start",
    mode: "words",
    prompt: "Your ideas",
  });
  await page.goto(audience.url);
  await expect(page.getByText("Add words", { exact: true })).toBeVisible();
  await page.getByText("Ask a question", { exact: true }).click();
  await page
    .locator("#student-questions textarea")
    .fill("Can you explain the example?");
  await page.locator("#student-questions button").click();
  await expect(page.locator("#question-notice")).toContainText(
    "Sent privately",
  );
  const words: unknown = await fetch(
    new URL("/api/feedback", audience.url),
  ).then((r) => r.json());
  expect(words).toMatchObject({ mode: "words", open: true });
  const questions: unknown = await audience
    .request(
      new URL("/presenter/feedback?mode=questions", audience.url).href,
      {},
    )
    .then((r) => r.json());
  expect(questions).toMatchObject({
    questionCount: 1,
    items: [{ text: "Can you explain the example?", status: "pending" }],
  });
  expect(
    await fetch(new URL("/api/audience", audience.url)).then((r) => r.text()),
  ).not.toContain("Can you explain");
  await publish(false);
  await expect(page.locator("#student-questions")).toBeHidden();
  await publish(true);
  await expect(page.getByText("Ask a question", { exact: true })).toBeVisible();
  const resumed: unknown = await audience
    .request(
      new URL("/presenter/feedback?mode=questions", audience.url).href,
      {},
    )
    .then((r) => r.json());
  expect(resumed).toMatchObject({ questionCount: 1 });
});
