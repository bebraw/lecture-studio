import test from "node:test";
import assert from "node:assert/strict";
import { buildLabel } from "../public/shared.mjs";

test("progress freezes at completion and distinguishes interruption from success", () => {
 const time = { startedAt: 1000, finishedAt: 75000 };
 assert.equal(buildLabel({ ...time, status: "ready", outcome: "completed" }), "Finished · 1:14");
 assert.equal(buildLabel({ ...time, status: "ready", outcome: "interrupted" }), "Interrupted · review partial work · 1:14");
 assert.equal(buildLabel({ ...time, status: "waiting" }), "Build paused · 1:14");
 assert.equal(buildLabel({ status: "ready" }), "Ready · nothing sent");
});
