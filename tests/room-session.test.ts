import { asError } from "../shared/errors.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
test("new lecture clears votes atomically; reopen and retry preserve them", async () => {
  let source = await readFile(
    new URL("../audience/room-state.ts", import.meta.url),
    "utf8",
  );
  source = source.replace(
    'import { DurableObject } from "cloudflare:workers";',
    "class DurableObject { constructor(ctx) { this.ctx=ctx; } }",
  );
  const { RoomState } = await import(
    "data:text/javascript;base64," +
      Buffer.from(stripTypeScriptTypes(source)).toString("base64")
  );
  const db = new DatabaseSync(":memory:");
  const ctx = {
    blockConcurrencyWhile(fn: () => unknown) {
      fn();
    },
    storage: {
      sql: {
        exec(query: string, ...args: import("node:sqlite").SQLInputValue[]) {
          if (query.includes("CREATE TABLE")) {
            db.exec(query);
            return;
          }
          const rows = db.prepare(query).all(...args);
          return { toArray: () => rows, one: () => rows[0] };
        },
      },
      transactionSync(fn: () => unknown) {
        db.exec("BEGIN");
        try {
          fn();
          db.exec("COMMIT");
        } catch (caught) {
          const e = asError(caught);
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
  };
  try {
    const room = new RoomState(ctx, {});
    await room.seedChoices([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ]);
    await room.castVote("voter", "a");
    assert.equal((await room.openSession("lecture-one")).totalVotes, 0);
    await room.castVote("voter", "b");
    await room.setStatus("locked");
    assert.equal((await room.openSession("lecture-one")).totalVotes, 1);
    assert.equal((await room.openSession("lecture-one")).totalVotes, 1);
    assert.equal((await room.openSession("lecture-two")).totalVotes, 0);
    assert.equal((await room.castVote("voter", "a")).snapshot.totalVotes, 1);
    const selected = await room.getSnapshot("voter");
    assert.equal(selected.currentSelection, "a");
    assert.equal(selected.status, "open");
    assert.deepEqual(selected.choices, [
      { id: "a", label: "A", votes: 1 },
      { id: "b", label: "B", votes: 0 },
    ]);
    const repeated = await room.castVote("voter", "a");
    assert.equal(repeated.ok, true);
    assert.equal(repeated.snapshot.revision, selected.revision);
    const replaced = await room.castVote("voter", "b");
    assert.equal(replaced.snapshot.totalVotes, 1);
    assert.equal(replaced.snapshot.currentSelection, "b");
    assert.equal(replaced.snapshot.revision, selected.revision + 1);
    assert.equal((await room.getSnapshot("other")).currentSelection, null);
    assert.deepEqual(await room.castVote("", "a"), {
      ok: false,
      code: "invalid-voter-key",
    });
    assert.deepEqual(await room.castVote("voter", "missing"), {
      ok: false,
      code: "unknown-choice",
    });
    const locked = await room.setStatus("locked");
    assert.equal(locked.status, "locked");
    assert.equal(locked.revision, replaced.snapshot.revision + 1);
    assert.equal((await room.setStatus("locked")).revision, locked.revision);
    assert.deepEqual(await room.castVote("voter", "a"), {
      ok: false,
      code: "room-locked",
    });
    const initialized = await room.initializeChoices([{ id: "c", label: "C" }]);
    assert.equal(initialized.totalVotes, 1);
    assert.equal(initialized.choices.length, 2);
    const reset = await room.resetVotes();
    assert.equal(reset.totalVotes, 0);
    assert.equal(reset.revision, locked.revision + 1);
    assert.equal((await room.resetVotes()).revision, reset.revision);
    await assert.rejects(() => room.setStatus("invalid"));
    for (const choices of [
      [],
      [{ id: "", label: "A" }],
      [{ id: "a", label: " " }],
      [
        { id: "a", label: "A" },
        { id: "a", label: "B" },
      ],
    ])
      await assert.rejects(() => room.seedChoices(choices));
    await assert.rejects(() => room.openSession("bad session"));
  } finally {
    db.close();
  }
});
