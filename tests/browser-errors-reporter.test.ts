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

const nativeDisconnect =
  "✘ [ERROR] kj::getCaughtExceptionAsKj() = kj/async-io-unix.c++:186: disconnected: ::write(fd, buffer.begin(), buffer.size()): Connection reset by peer";
const passed = {
  status: "passed" as const,
  startTime: new Date(),
  duration: 1,
};

test("Linux workerd client-disconnect diagnostics remain nonfatal across chunk boundaries", async () => {
  for (const chunks of [
    [nativeDisconnect + "\n\n  stack: workerd@123\n"],
    [
      "\u001b[31m" + nativeDisconnect.slice(0, 12),
      nativeDisconnect.slice(12) + "\u001b[0m\n",
    ],
    [nativeDisconnect],
    [nativeDisconnect.replace("Connection reset by peer", "Broken pipe")],
  ]) {
    const reporter = new BrowserErrorsReporter();
    for (const chunk of chunks) reporter.onStdErr(chunk);
    assert.equal(await reporter.onEnd(passed), undefined);
  }
});

test("native disconnects never mask nearby application errors or different native failures", async (context) => {
  context.mock.method(console, "error", () => {});
  for (const error of [
    "[ERROR] Uncaught Error: Connection reset by peer",
    nativeDisconnect.replace("Connection reset by peer", "Permission denied"),
    nativeDisconnect + " Uncaught TypeError: broken handler",
    "[ERROR] unexpected runtime failure",
  ]) {
    for (const text of [
      nativeDisconnect + "\n" + error,
      error + "\n" + nativeDisconnect,
    ]) {
      const reporter = new BrowserErrorsReporter();
      reporter.onStdErr(text);
      assert.deepEqual(await reporter.onEnd(passed), { status: "failed" });
    }
  }
});
