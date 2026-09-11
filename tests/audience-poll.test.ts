import test from "node:test";
import assert from "node:assert/strict";
import { AudiencePoll, themePoll, validatePoll } from "../lib/audience-poll.ts";
export function pollFixture() {
  let snapshot = {
    status: "locked",
    revision: 1,
    totalVotes: 0,
    choices: themePoll().options.map((o) => ({ ...o, votes: 0 })),
  };
  const calls: { url: string; init: RequestInit }[] = [];
  const poll = new AudiencePoll({
    origin: "https://audience.example",
    token: "private-presenter-secret",
    fetcher: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/open-session"))
        snapshot = {
          ...snapshot,
          status: "open",
          revision: snapshot.revision + 1,
        };
      if (url.endsWith("/lock"))
        snapshot = {
          ...snapshot,
          status: "locked",
          revision: snapshot.revision + 1,
        };
      return new Response(JSON.stringify(snapshot));
    },
  });
  return {
    poll,
    calls,
    votes: (counts: number[]) => {
      snapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        choices: snapshot.choices.map((c, i) => ({
          ...c,
          votes: counts[i] ?? 0,
        })),
        totalVotes: counts.reduce((a, b) => a + b, 0),
      };
    },
  };
}
test("open, aggregate, lock, freeze, receipt; no votes or resets sent", async () => {
  const { poll, calls, votes } = pollFixture();
  assert.throws(() => poll.receipt());
  await poll.act("open");
  votes([1, 3, 2]);
  await poll.act("refresh");
  await poll.act("lock");
  const receipt = poll.receipt();
  assert.equal(poll.frozen!.winner.id, "retro-web");
  votes([100, 0, 0]);
  assert.equal(poll.receipt(), receipt);
  await poll.act("open");
  assert.equal(poll.frozen, null);
  assert.equal(poll.snapshot!.status, "open");
  assert.equal(poll.snapshot!.totalVotes, 100);
  assert.throws(() => poll.receipt(), /Close/);
  await poll.act("lock");
  assert.equal(poll.frozen!.winner.id, "editorial");
  assert.ok(!JSON.stringify(poll.state()).includes("private-presenter-secret"));
  assert.ok(
    calls.every((c) => !c.url.endsWith("/reset") && !c.url.endsWith("/seed")),
  );
  assert.ok(
    calls
      .filter((c) => c.init.method === "GET")
      .every((c) => !new Headers(c.init.headers).get("Authorization")),
  );
});
test("zero votes and ties are deterministic and labeled", async () => {
  const a = pollFixture();
  await a.poll.act("lock");
  assert.equal(a.poll.frozen!.winner.id, "editorial");
  assert.match(a.poll.frozen!.reason, /No votes/);
  const b = pollFixture();
  await b.poll.act("open");
  b.votes([0, 2, 2]);
  await b.poll.act("lock");
  assert.equal(b.poll.frozen!.winner.id, "retro-web");
  assert.match(b.poll.frozen!.reason, /Tie/);
});
test("mismatched room is refused before mutation", async () => {
  const { poll, calls } = pollFixture();
  poll.configure({
    ...themePoll(),
    options: [
      { id: "different", label: "Different" },
      { id: "other", label: "Other" },
    ],
    defaultId: "different",
  });
  await assert.rejects(() => poll.act("open"), /match/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.init.method, "GET");
});

test("lecture reset rotates the session; reopen retains it and refresh hides old counts", async () => {
  const { poll, calls, votes } = pollFixture();
  votes([4, 2, 1]);
  await poll.act("refresh");
  assert.equal(poll.snapshot!.totalVotes, 0);
  await poll.act("open");
  const first = new Headers(calls.at(-1)!.init.headers).get(
    "X-Lecture-Session",
  );
  await poll.act("lock");
  await poll.act("open");
  assert.equal(
    new Headers(calls.at(-1)!.init.headers).get("X-Lecture-Session"),
    first,
  );
  await poll.act("lock");
  poll.reset();
  await poll.act("open");
  assert.notEqual(
    new Headers(calls.at(-1)!.init.headers).get("X-Lecture-Session"),
    first,
  );
});

test("poll definitions enforce bounded unique choices and a declared default", () => {
  const valid = themePoll();
  assert.deepEqual(validatePoll(valid), valid);
  const invalid: unknown[] = [
    null,
    {},
    { ...valid, question: " " },
    { ...valid, question: "q".repeat(201) },
    { ...valid, options: valid.options.slice(0, 1) },
    {
      ...valid,
      options: Array.from({ length: 7 }, (_, i) => ({
        id: String(i),
        label: String(i),
      })),
    },
    { ...valid, defaultId: "missing" },
    { ...valid, options: [valid.options[0], valid.options[0]] },
  ];
  for (const option of [
    null,
    { id: "BAD", label: "OK" },
    { id: "x".repeat(51), label: "OK" },
    { id: "valid", label: " " },
    { id: "valid", label: "x".repeat(81) },
  ])
    invalid.push({ ...valid, options: [option, valid.options[1]] });
  for (const input of invalid) assert.throws(() => validatePoll(input));
  const maximum = {
    question: "q".repeat(200),
    options: Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      label: "x".repeat(80),
    })),
    defaultId: "0",
  };
  assert.deepEqual(validatePoll(maximum), maximum);
});

test("poll origins and active rounds reject unsafe changes", async () => {
  for (const origin of [
    "http://public.example",
    "https://u:p@public.example",
    "https://public.example/path",
    "https://public.example/?token=x",
    "https://public.example/#token",
  ])
    assert.throws(() => new AudiencePoll({ origin }));
  for (const origin of [
    "https://public.example",
    "http://localhost:8796",
    "http://127.0.0.1:8796",
  ])
    assert.equal(new AudiencePoll({ origin }).origin, origin);
  const { poll } = pollFixture();
  await poll.act("open");
  assert.throws(() => poll.select("priority"), /Close/);
  assert.throws(() => poll.configure(themePoll()), /active/);
  await poll.act("lock");
  const frozen = structuredClone(poll.frozen);
  await assert.rejects(() => poll.act("refresh"), /Reopen/);
  assert.throws(() => poll.configure(themePoll()), /frozen/);
  poll.select("priority");
  assert.equal(poll.pollId, "priority");
  assert.equal(poll.frozen, null);
  poll.select("theme");
  assert.deepEqual(poll.frozen, frozen);
  assert.ok(poll.decisions().theme);
  assert.throws(() => poll.select("missing"), /Unknown/);
  poll.busy = true;
  await assert.rejects(() => poll.act("open"), /already running/);
  poll.busy = false;
  poll.reset();
  assert.deepEqual(poll.decisions(), {});
  assert.equal(poll.snapshot, null);
  assert.equal(poll.frozen, null);
});

test("invalid audience aggregates fail before opening voting", async () => {
  const valid = {
    status: "locked",
    revision: 1,
    totalVotes: 0,
    choices: themePoll().options.map((o) => ({ ...o, votes: 0 })),
  };
  const invalid = [
    { ...valid, status: "bad" },
    { ...valid, revision: -1 },
    { ...valid, revision: 1.5 },
    { ...valid, totalVotes: 1 },
    { ...valid, choices: [] },
    ...[{ votes: -1 }, { votes: 0.5 }, { label: "Mismatch" }].map((change) => ({
      ...valid,
      choices: valid.choices.map((c, i) => (i === 0 ? { ...c, ...change } : c)),
    })),
  ];
  for (const value of invalid) {
    const methods: string[] = [];
    const poll = new AudiencePoll({
      origin: "https://audience.invalid",
      token: "private",
      fetcher: async (_url, init) => {
        methods.push(init.method!);
        return Response.json(value);
      },
    });
    await assert.rejects(() => poll.act("open"));
    assert.deepEqual(methods, ["GET"]);
    assert.equal(poll.busy, false);
    assert.ok(poll.error);
  }
});
