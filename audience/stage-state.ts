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
      "CREATE TABLE IF NOT EXISTS feedback_items (id TEXT PRIMARY KEY, round TEXT, text TEXT, status TEXT, voter TEXT, network TEXT, created INTEGER)",
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
    return { config, items };
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
      const expires = Date.now() + 86400000;
      // Explicit new collection replaces only feedback, never votes or stage data.
      sql.exec("DELETE FROM feedback_items");
      sql.exec(
        "INSERT OR REPLACE INTO feedback_meta VALUES (1,?,?,?,?,?)",
        crypto.randomUUID(),
        input.mode,
        input.prompt.trim(),
        1,
        expires,
      );
      await this.ctx.storage.setAlarm(expires);
    } else if (action === "close")
      sql.exec("UPDATE feedback_meta SET opened=0");
    else if (action === "approve" || action === "done") {
      if (typeof input.id !== "string") throw new Error("Choose a response");
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
    text = text
      .normalize("NFKC")
      // Remove control and bidi characters from audience submissions.
      // oxlint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (
      !text ||
      text.length > (config.mode === "words" ? 32 : 400) ||
      (config.mode === "words" && text.split(" ").length > 3)
    )
      return {
        status: 400,
        error:
          config.mode === "words"
            ? "Use 1–3 words, up to 32 characters"
            : "Use a question up to 400 characters",
      };
    const total = sql
      .exec<{ n: number }>("SELECT count(*) n FROM feedback_items")
      .one().n;
    const personal = sql
      .exec<{ n: number; latest: number }>(
        "SELECT count(*) n, coalesce(max(created),0) latest FROM feedback_items WHERE voter=?",
        voter,
      )
      .one();
    const recent = sql
      .exec<{ n: number }>(
        "SELECT count(*) n FROM feedback_items WHERE network=? AND created>?",
        network,
        now - 60000,
      )
      .one().n;
    if (
      total >= 500 ||
      personal.n >= 5 ||
      now - personal.latest < 20000 ||
      recent >= 120
    )
      return {
        status: 429,
        error: "Submission limit reached. Please wait or ask aloud.",
      };
    sql.exec(
      "INSERT INTO feedback_items VALUES (?,?,?,?,?,?,?)",
      crypto.randomUUID(),
      round,
      text,
      "pending",
      voter,
      network,
      now,
    );
    return { status: 201 };
  }
  override async alarm() {
    const row = this.ctx.storage.sql
      .exec<{ expires: number }>("SELECT expires FROM feedback_meta WHERE id=1")
      .toArray()[0];
    if (row && row.expires > Date.now()) {
      await this.ctx.storage.setAlarm(row.expires);
      return;
    }
    this.ctx.storage.sql.exec("DELETE FROM feedback_items");
    this.ctx.storage.sql.exec("DELETE FROM feedback_meta");
  }
}
