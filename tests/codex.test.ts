import * as v from "valibot";
import { ChildProcess } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough, Writable } from "node:stream";
import { CodexBridge } from "../lib/codex.ts";
const sentSchema = v.object({
  id: v.exactOptional(v.union([v.string(), v.number()])),
  method: v.exactOptional(v.string()),
  params: v.exactOptional(v.record(v.string(), v.unknown())),
  result: v.exactOptional(v.unknown()),
  error: v.exactOptional(v.object({ code: v.number() })),
});
function backend() {
  const proc = new ChildProcess(),
    sent: v.InferOutput<typeof sentSchema>[] = [];
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.kill = () => true;
  proc.stdin = new Writable({
    write(chunk: Buffer, _encoding, done) {
      const message = v.parse(sentSchema, JSON.parse(chunk.toString()));
      sent.push(message);
      const result =
        message.method === "initialize"
          ? {}
          : message.method === "model/list"
            ? { data: [{ id: "test-model", model: "test-model" }] }
            : message.method === "thread/start"
              ? { thread: { id: "thread-one" } }
              : message.method === "turn/start"
                ? { turn: { id: "turn-one", status: "inProgress" } }
                : message.method === "turn/interrupt"
                  ? {}
                  : null;
      if (message.id !== undefined && message.method && result !== null)
        queueMicrotask(() =>
          (proc.stdout as PassThrough).write(
            JSON.stringify({ id: message.id, result }) + "\n",
          ),
        );
      done();
    },
  });
  return { proc, sent };
}
test("Codex uses reviewed text, workspace sandbox, automatic approval review and one active turn", async () => {
  const { proc, sent } = backend();
  let spawnArgs: [string, string[], SpawnOptions] | undefined;
  const bridge = new CodexBridge({
    validateWorkspace: async (path) => path,
    spawnProcess: (...args) => {
      spawnArgs = args;
      return proc;
    },
  });
  try {
    await bridge.connect(process.cwd());
    assert.equal(bridge.state.status, "ready");
    assert.equal(bridge.state.threadId, null);
    assert.equal(spawnArgs![2].shell, false);
    assert.equal(spawnArgs![2].env!.OBSIDIAN_API_KEY, undefined);
    assert.ok(!spawnArgs![1].some((s) => s.includes('mcp_servers."')));
    await bridge.start("EXACT reviewed brief", "test-model");
    assert.deepEqual(
      sent.find((x) => x.method === "thread/start")!.params!.config,
      { model_reasoning_effort: "low" },
    );
    assert.equal(
      sent.find((x) => x.method === "turn/start")!.params!.effort,
      "low",
    );
    assert.match(
      String(
        sent.find((x) => x.method === "thread/start")!.params!
          .developerInstructions,
      ),
      /LECTURE DEMO MODE/,
    );
    assert.equal(
      sent.find((x) => x.method === "thread/start")!.params!.sandbox,
      "workspace-write",
    );
    assert.equal(
      sent.find((x) => x.method === "thread/start")!.params!.approvalPolicy,
      "on-request",
    );
    assert.equal(
      sent.find((x) => x.method === "thread/start")!.params!.approvalsReviewer,
      "auto_review",
    );
    assert.equal(
      sent.find((x) => x.method === "turn/start")!.params!.approvalsReviewer,
      "auto_review",
    );
    assert.equal(
      sent.find((x) => x.method === "turn/start")!.params!.approvalPolicy,
      "on-request",
    );
    assert.deepEqual(
      sent.find((x) => x.method === "turn/start")!.params!.input,
      [{ type: "text", text: "EXACT reviewed brief" }],
    );
    await assert.rejects(() => bridge.start("Duplicate"));
    bridge.receive({
      id: "approval",
      method: "item/commandExecution/requestApproval",
      params: { command: "test" },
    });
    assert.equal(bridge.state.status, "waiting");
    assert.throws(() => bridge.answer("approval", "acceptForSession"));
    bridge.answer("approval", "accept");
    assert.deepEqual(sent.at(-1), {
      id: "approval",
      result: { decision: "accept" },
    });
    bridge.receive({
      id: "input",
      method: "item/tool/requestUserInput",
      params: { questions: [{ id: "q", question: "Continue?" }] },
    });
    assert.throws(() => bridge.answer("input", "answer", {}));
    bridge.answer("input", "answer", { q: "Yes" });
    assert.deepEqual(sent.at(-1)!.result, {
      answers: { q: { answers: ["Yes"] } },
    });
    bridge.receive({ id: "unknown", method: "unsupported/request" });
    assert.equal(sent.at(-1)!.error!.code, -32601);
    bridge.receive({
      method: "item/agentMessage/delta",
      params: { threadId: "thread-one", itemId: "m", delta: "Finished" },
    });
    const incoming = (message: unknown) =>
      proc.stdout?.emit("data", JSON.stringify(message) + "\n");
    incoming({
      id: "nullable",
      method: "item/commandExecution/requestApproval",
      params: { command: null, reason: null },
    });
    assert.equal(bridge.state.status, "waiting");
    assert.equal(bridge.snapshot().requests[0]?.params.command, "");
    bridge.answer("nullable", "accept");
    incoming({
      id: "free-text",
      method: "item/tool/requestUserInput",
      params: {
        questions: [
          { id: "q", header: "Continue", question: "Why?", options: null },
        ],
      },
    });
    assert.deepEqual(
      bridge.snapshot().requests[0]?.params.questions?.[0]?.options,
      [],
    );
    bridge.answer("free-text", "answer", { q: "Continue the lecture" });
    incoming({
      method: "turn/completed",
      params: { turn: { status: "completed", error: null } },
    });
    assert.equal(bridge.state.status, "ready");
    assert.equal(bridge.state.messages[0]?.text, "Finished");
    await bridge.start("Second increment", "test-model");
    assert.equal(sent.filter((x) => x.method === "thread/start").length, 1);
    assert.equal(
      sent.filter((x) => x.method === "turn/start").at(-1)!.params!.effort,
      "low",
    );
  } finally {
    bridge.close();
  }
  assert.equal(bridge.state.threadId, null);
});
