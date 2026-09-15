import { DurableObject } from "cloudflare:workers";
type JsonScalar = string | number | boolean | null;
export type JsonValue =
  JsonScalar | JsonScalar[] | { [key: string]: JsonScalar | JsonScalar[] };

// One object per lecture broadcast; voting remains in separate room objects.
export class StageState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS feedback_meta (id INTEGER PRIMARY KEY, round TEXT, mode TEXT, prompt TEXT, opened INTEGER, expires INTEGER)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS feedback_collections (collection TEXT PRIMARY KEY, round TEXT, mode TEXT, prompt TEXT, expires INTEGER)",
    );
    ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO feedback_collections SELECT 'legacy:' || round,round,mode,prompt,expires FROM feedback_meta WHERE round NOT IN (SELECT round FROM feedback_collections)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS feedback_items (id TEXT PRIMARY KEY, round TEXT, text TEXT, status TEXT, voter TEXT, network TEXT, created INTEGER)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS feedback_approvals (id TEXT PRIMARY KEY, round TEXT, text TEXT)",
    );
    ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO feedback_approvals SELECT id,round,text FROM feedback_items WHERE status='approved'",
    );
  }
  async publish(stage: Record<string, JsonValue>) {
    if (stage.live === false)
      this.ctx.storage.sql.exec("UPDATE feedback_meta SET opened=0");
    await this.ctx.storage.put("stage", stage);
  }
  async read() {
    return (
      (await this.ctx.storage.get<Record<string, JsonValue>>("stage")) || null
    );
  }
  feedbackPublic() {
    const row = this.ctx.storage.sql
      .exec<{
        round: string;
        mode: string;
        prompt: string;
        opened: number;
        expires: number;
      }>("SELECT * FROM feedback_meta WHERE id=1")
      .toArray()[0];
    return row && row.expires > Date.now()
      ? {
          round: row.round,
          mode: row.mode,
          prompt: row.prompt,
          open: !!row.opened,
        }
      : null;
  }
  feedbackPrivate() {
    const config = this.feedbackPublic();
    const items = config
      ? this.ctx.storage.sql
          .exec<{ id: string; text: string; status: string }>(
            "SELECT id,text,status FROM feedback_items WHERE round=? ORDER BY created,id",
            config.round,
          )
          .toArray()
      : [];
    const approvedWords = config
      ? this.ctx.storage.sql
          .exec<{ text: string }>(
            "SELECT text FROM feedback_approvals WHERE round=? ORDER BY id",
            config.round,
          )
          .toArray()
          .map((row) => row.text)
      : [];
    return { config, items, approvedWords };
  }
  async feedbackManage(action: string, input: Record<string, unknown>) {
    const sql = this.ctx.storage.sql;
    if (action === "start") {
      if ((await this.read())?.live !== true)
        throw new Error("Turn Live on first");
      if (
        !["questions", "words"].includes(String(input.mode)) ||
        typeof input.prompt !== "string" ||
        !input.prompt.trim() ||
        input.prompt.length > 200
      )
        throw new Error("Choose a mode and a short prompt");
      const key =
        input.collection ??
        (input.mode === "questions" ? "questions" : crypto.randomUUID());
      if (typeof key !== "string" || !key || key.length > 240)
        throw new Error("Invalid collection identity");
      const prior = sql
        .exec<{ round: string; expires: number }>(
          "SELECT round,expires FROM feedback_collections WHERE collection=? AND expires>?",
          key,
          Date.now(),
        )
        .toArray()[0];
      const expires = prior?.expires ?? Date.now() + 86400000;
      const round = prior?.round ?? crypto.randomUUID();
      // Navigation selects a collection; only a new lecture erases all collections.
      sql.exec(
        "INSERT OR REPLACE INTO feedback_collections VALUES (?,?,?,?,?)",
        key,
        round,
        input.mode,
        input.prompt.trim(),
        expires,
      );
      sql.exec(
        "INSERT OR REPLACE INTO feedback_meta VALUES (1,?,?,?,?,?)",
        round,
        input.mode,
        input.prompt.trim(),
        1,
        expires,
      );
      const earliest = sql
        .exec<{ expires: number }>(
          "SELECT min(expires) expires FROM feedback_collections",
        )
        .one().expires;
      await this.ctx.storage.setAlarm(earliest);
    } else if (action === "close")
      sql.exec("UPDATE feedback_meta SET opened=0");
    else if (action === "approve" || action === "done") {
      if (typeof input.id !== "string") throw new Error("Choose a response");
      if (action === "approve")
        sql.exec(
          "INSERT OR IGNORE INTO feedback_approvals SELECT id,round,text FROM feedback_items WHERE id=?",
          input.id,
        );
      sql.exec(
        "UPDATE feedback_items SET status=? WHERE id=?",
        action === "approve" ? "approved" : "done",
        input.id,
      );
    } else throw new Error("Unknown action");
    return this.feedbackPrivate();
  }
  async feedbackSubmit(
    round: string,
    text: string,
    voter: string,
    network: string,
  ) {
    const stage = await this.read(),
      config = this.feedbackPublic(),
      now = Date.now(),
      sql = this.ctx.storage.sql;
    if (stage?.live !== true || !config?.open || round !== config.round)
      return { status: 409, error: "Collection is closed" };
    // Preserve line boundaries until word-cloud entries have been separated.
    const entries = (
      config.mode === "words" ? text.split(/\r\n|\r|\n/) : [text]
    )
      .map((entry) =>
        entry
          .normalize("NFKC")
          // Remove control and bidi characters from each entry.
          .replace(
            // oxlint-disable-next-line no-control-regex
            /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
            " ",
          )
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);
    if (
      !entries.length ||
      entries.length > 5 ||
      entries.some(
        (entry) =>
          entry.length > (config.mode === "words" ? 32 : 400) ||
          (config.mode === "words" && entry.split(" ").length > 3),
      )
    )
      return {
        status: 400,
        error:
          config.mode === "words"
            ? "Enter one idea per line: 1–3 words, up to 32 characters each; at most five ideas"
            : "Use a question up to 400 characters",
      };
    const total = sql
      .exec<{ n: number }>(
        "SELECT count(*) n FROM feedback_items WHERE round=?",
        round,
      )
      .one().n;
    const personal = sql
      .exec<{ n: number; latest: number }>(
        "SELECT count(*) n, coalesce(max(created),0) latest FROM feedback_items WHERE voter=? AND round=?",
        voter,
        round,
      )
      .one();
    const recent = sql
      .exec<{ n: number }>(
        "SELECT count(*) n FROM (SELECT voter,created FROM feedback_items WHERE network=? AND created>? GROUP BY voter,created)",
        network,
        now - 60000,
      )
      .one().n;
    if (
      total + entries.length > 500 ||
      personal.n + entries.length > 5 ||
      now - personal.latest < 20000 ||
      recent >= 120
    )
      return {
        status: 429,
        error: "Submission limit reached. Please wait or ask aloud.",
      };
    this.ctx.storage.transactionSync(() => {
      for (const entry of entries)
        sql.exec(
          "INSERT INTO feedback_items VALUES (?,?,?,?,?,?,?)",
          crypto.randomUUID(),
          round,
          entry,
          "pending",
          voter,
          network,
          now,
        );
    });
    return { status: 201 };
  }
  async resetFeedback() {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM feedback_items");
      this.ctx.storage.sql.exec("DELETE FROM feedback_approvals");
      this.ctx.storage.sql.exec("DELETE FROM feedback_meta");
      this.ctx.storage.sql.exec("DELETE FROM feedback_collections");
    });
    await this.ctx.storage.deleteAlarm();
  }
  override async alarm() {
    const sql = this.ctx.storage.sql;
    sql.exec(
      "DELETE FROM feedback_approvals WHERE round IN (SELECT round FROM feedback_collections WHERE expires<=?)",
      Date.now(),
    );
    sql.exec(
      "DELETE FROM feedback_items WHERE round IN (SELECT round FROM feedback_collections WHERE expires<=?)",
      Date.now(),
    );
    sql.exec("DELETE FROM feedback_collections WHERE expires<=?", Date.now());
    sql.exec("DELETE FROM feedback_meta WHERE expires<=?", Date.now());
    const next = sql
      .exec<{ expires: number | null }>(
        "SELECT min(expires) expires FROM feedback_collections",
      )
      .one().expires;
    if (next) await this.ctx.storage.setAlarm(next);
  }
}
