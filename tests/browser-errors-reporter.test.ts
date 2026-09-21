import { test } from "node:test";
import assert from "node:assert/strict";
import BrowserErrorsReporter from "../scripts/browser-errors-reporter.ts";

test("browser runtime errors fail a passing suite, including fragmented coloured logs", async (context) => {
  context.mock.method(console, "error", () => {});
  for (const chunks of [
    ["\u001b[31m[ERR", "OR]\u001b[0m Uncaught Error: rejected RPC"],
    [Buffer.from("Uncaught TypeError: broken handler")],
  ]) {
    const reporter = new BrowserErrorsReporter();
    for (const chunk of chunks) reporter.onStdErr(chunk);
    assert.deepEqual(
      await reporter.onEnd({
        status: "passed",
        startTime: new Date(),
        duration: 1,
      }),
      { status: "failed" },
    );
    assert.deepEqual(
      await reporter.onEnd({
        status: "timedout",
        startTime: new Date(),
        duration: 1,
      }),
      { status: "timedout" },
    );
  }
});

test("ordinary tool warnings do not fail the browser suite", async () => {
  const reporter = new BrowserErrorsReporter();
  reporter.onStdErr("Warning: NO_COLOR ignored because FORCE_COLOR is set\n");
  reporter.onStdErr("[DEP0190] DeprecationWarning: shell option\n");
  assert.equal(
    await reporter.onEnd({
      status: "passed",
      startTime: new Date(),
      duration: 1,
    }),
    undefined,
  );
});
