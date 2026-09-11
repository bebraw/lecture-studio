// Isolated local Worker only. Never sends public lecture submissions.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const origin = "http://127.0.0.1:8796";
const { PRESENTER_TOKEN: token } = JSON.parse(
  (
    await readFile(new URL("../.local/audience/secrets.json", import.meta.url))
  ).toString(),
);
const headers = {
  authorization: "Bearer " + token,
  "content-type": "application/json",
};
const admin = async (body?: Record<string, unknown>) => {
  const response = await fetch(origin + "/presenter/feedback", {
    method: body ? "POST" : "GET",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
};
const publish = (live: boolean) =>
  fetch(origin + "/presenter/stage", {
    method: "POST",
    headers,
    body: JSON.stringify({
      live,
      title: "Test slide",
      html: "",
      mode: "material",
      version: String(Date.now()),
    }),
  });
for (const id of [
  "webdev-2026",
  "webdev-2026-friction",
  "webdev-2026-priority",
])
  await fetch(origin + "/presenter/rooms/" + id + "/lock", {
    method: "POST",
    headers,
  });
await publish(true);
assert.equal((await fetch(origin + "/presenter/feedback")).status, 401);
let snapshot = await admin({
  action: "start",
  mode: "questions",
  prompt: "Any questions?",
});
const submit = (text: string, extra: Record<string, string> = {}) =>
  fetch(origin + "/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...extra },
    body: JSON.stringify({ round: snapshot.config.round, text }),
  });
assert.equal(
  (await submit("Cross origin", { origin: "https://evil.invalid" })).status,
  403,
);
assert.equal((await submit("x".repeat(401))).status, 400);
let response = await submit("PRIVATE question <script>alert(1)</script>");
assert.equal(response.status, 201);
const cookie = response.headers.get("set-cookie")!.split(";")[0];
assert.ok(cookie);
assert.equal((await submit("Too soon", { cookie })).status, 429);
assert.doesNotMatch(
  await (await fetch(origin + "/api/feedback")).text(),
  /PRIVATE|script/,
);
assert.doesNotMatch(
  await (await fetch(origin + "/api/audience")).text(),
  /PRIVATE|script/,
);
snapshot = await admin();
assert.equal(snapshot.items[0].status, "pending");
await admin({ action: "done", id: snapshot.items[0].id });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByText("Ask a question", { exact: true }).click();
  await page.getByLabel("Any questions?").fill("A browser question");
  await page.getByRole("button", { name: "Send privately" }).click();
  await page
    .getByText("Sent privately. The lecturer chooses what to show.")
    .waitFor();
  await admin({ action: "close" });
  await page.locator("#student-feedback").waitFor({ state: "hidden" });
  snapshot = await admin({
    action: "start",
    mode: "words",
    prompt: "Describe the web",
  });
  await page.getByText("Add words", { exact: true }).waitFor();
  assert.equal((await submit("one two three four")).status, 400);
  assert.equal((await submit("hypermedia")).status, 201);
  snapshot = await admin();
  assert.equal(snapshot.items.length, 1);
  await admin({ action: "approve", id: snapshot.items[0].id });
  assert.doesNotMatch(
    await (await fetch(origin + "/api/audience")).text(),
    /hypermedia/,
  );
  await publish(false);
  assert.equal((await submit("late")).status, 409);
  assert.equal(
    (await (await fetch(origin + "/api/feedback")).json()).open,
    false,
  );
  await page.locator("#student-feedback").waitFor({ state: "hidden" });
  console.log(
    "Feedback privacy, auth, same-origin checks, limits, student form, approval and Live off passed.",
  );
} finally {
  await browser.close();
  await admin({ action: "close" });
  await publish(false);
}
