import { asError } from "../shared/errors.ts";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { AudiencePoll, lecturePolls } from "../lib/audience-poll.ts";
import { PresentationSession, parsePresentation } from "../lib/presentation.ts";
const local = new URL("../.local/audience/", import.meta.url);
const target = JSON.parse(
  (await readFile(new URL("deployment.json", local))).toString(),
);
assert.equal(target.status, "deployed");
assert.equal(
  new URL(target.origin).hostname,
  target.workerName + ".survivejs.workers.dev",
);
const token = JSON.parse(
  (await readFile(new URL("secrets.json", local))).toString(),
).PRESENTER_TOKEN;
for (const id of [
  "webdev-2026-friction",
  "webdev-2026",
  "webdev-2026-priority",
]) {
  const response = await fetch(
    target.origin + "/presenter/rooms/" + id + "/seed",
    { method: "POST", headers: { authorization: "Bearer " + token } },
  );
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.status, "locked");
  console.log(
    id + ": provisioned and locked, " + snapshot.totalVotes + " votes",
  );
}
const record = new URL("smoke-vote.json", local);
try {
  await readFile(record);
  throw new Error("A test attempt already exists; refusing a repeat vote.");
} catch (caught) {
  const error = asError(caught);
  if (error.code !== "ENOENT") throw error;
}
const poll = new AudiencePoll({ origin: target.origin, token });
poll.select("friction");
await poll.act("open");
const receipt = {
  workerName: target.workerName,
  room: "webdev-2026-friction",
  choice: "trust",
  attemptedAt: new Date().toISOString(),
  outcome: "pending",
  totalVotes: 0,
};
await writeFile(record, JSON.stringify(receipt, null, 2), {
  flag: "wx",
  mode: 0o600,
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(target.origin + "/rooms/webdev-2026-friction");
  await page.locator('input[value="trust"]').check();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: "Vote", exact: true }).click(),
  ]);
  assert.equal(response.status(), 303);
  await page.waitForLoadState();
  await poll.act("lock");
  assert.ok(poll.frozen);
  assert.equal(poll.frozen.winner.id, "trust");
  assert.equal(poll.frozen.totalVotes, 1);
  const definition = {
    version: 1,
    title: "Smoke check",
    start: "build",
    steps: [
      {
        id: "vote",
        type: "poll",
        title: "Friction",
        room: "webdev-2026-friction",
        poll: lecturePolls.friction,
      },
      {
        id: "build",
        type: "build",
        title: "Build",
        body: "Build the page.",
        uses: [
          {
            poll: "vote",
            instructions: {
              finding: "Make it scannable.",
              repeating: "Preserve input.",
              navigation: "Use descriptive links.",
              trust: "Attribute facts to their source.",
            },
          },
        ],
      },
    ],
  };
  const session = new PresentationSession(
    parsePresentation({
      sections: [
        {
          heading: "Presentation",
          body: "```json\n" + JSON.stringify(definition) + "\n```",
        },
      ],
    }),
    "smoke",
  );
  session.decisions.vote = poll.frozen;
  assert.match(session.resolve().prompt, /Attribute facts to their source/);
  receipt.outcome = "accepted";
  receipt.totalVotes = poll.frozen.totalVotes;
  console.log(
    "Public native-form vote accepted: Knowing what to trust. Frozen result changes the resolved build prompt. No model called; test vote retained.",
  );
} catch (caught) {
  const error = asError(caught);
  receipt.outcome = "uncertain";
  throw error;
} finally {
  await writeFile(record, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  await browser.close();
  if (!poll.frozen) await poll.act("lock");
}
const envPath = new URL("../.env", import.meta.url);
let env = "";
try {
  env = await readFile(envPath, "utf8");
} catch (caught) {
  const error = asError(caught);
  if (error.code !== "ENOENT") throw error;
}
for (const [key, value] of Object.entries({
  LECTURE_PORT: "4318",
  LECTURE_POLL_ORIGIN: target.origin,
  LECTURE_POLL_ROOM: "webdev-2026",
  LECTURE_POLL_TOKEN: token,
})) {
  const line = key + "=" + value;
  const pattern = new RegExp("^" + key + "=.*$", "m");
  env = pattern.test(env)
    ? env.replace(pattern, line)
    : env.trimEnd() + "\n" + line + "\n";
}
await writeFile(envPath, env, { mode: 0o600 });
console.log("Studio voting configuration saved privately; restart required.");
