import { StageState } from "./stage-state.ts";

/** One isolated Durable Object per hosted Q&A session, independent of lecture Live state. */
export class QuestionSession extends StageState {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS qa_config (id INTEGER PRIMARY KEY, title TEXT NOT NULL, key_hash TEXT NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS qa_logins (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS qa_attempts (network TEXT PRIMARY KEY, started INTEGER NOT NULL, attempts INTEGER NOT NULL)",
    );
  }
  private config() {
    return this.ctx.storage.sql
      .exec<{ title: string; key_hash: string }>(
        "SELECT title,key_hash FROM qa_config WHERE id=1",
      )
      .toArray()[0];
  }
  // Existing collection expiry, status transitions and submission limits apply unchanged.
  override async read(): ReturnType<StageState["read"]> {
    return this.config() ? { live: true } : null;
  }
  configure(action: "create" | "rotate", title: string, keyHash: string) {
    const existing = this.config();
    if (action === "create" && existing) return false;
    if (action === "rotate" && !existing) return false;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO qa_config VALUES (1,?,?)",
        title,
        keyHash,
      );
      this.ctx.storage.sql.exec("DELETE FROM qa_logins");
    });
    return true;
  }
  publicSession() {
    const config = this.config();
    return config
      ? { title: config.title, config: this.feedbackPublic(true) }
      : null;
  }
  privateSession() {
    return {
      title: this.config()!.title,
      feedback: this.feedbackPrivate(true),
    };
  }
  login(keyHash: string, sessionHash: string, network: string) {
    const sql = this.ctx.storage.sql,
      now = Date.now();
    sql.exec("DELETE FROM qa_attempts WHERE started<=?", now - 60000);
    sql.exec("DELETE FROM qa_logins WHERE expires<=?", now);
    const attempt = sql
      .exec<{ attempts: number }>(
        "SELECT attempts FROM qa_attempts WHERE network=?",
        network,
      )
      .toArray()[0];
    if (
      (attempt?.attempts || 0) >= 5 ||
      (!attempt &&
        sql.exec<{ n: number }>("SELECT count(*) n FROM qa_attempts").one().n >=
          500)
    )
      return 429;
    sql.exec(
      "INSERT INTO qa_attempts VALUES (?,?,1) ON CONFLICT(network) DO UPDATE SET attempts=attempts+1",
      network,
      now,
    );
    const config = this.config();
    const encoder = new TextEncoder();
    if (
      !config ||
      !crypto.subtle.timingSafeEqual(
        encoder.encode(keyHash),
        encoder.encode(config.key_hash),
      )
    )
      return 401;
    if (
      sql.exec<{ n: number }>("SELECT count(*) n FROM qa_logins").one().n >= 100
    )
      return 429;
    sql.exec(
      "INSERT INTO qa_logins VALUES (?,?)",
      sessionHash,
      now + 8 * 3600000,
    );
    return 200;
  }
  authenticated(sessionHash: string) {
    this.ctx.storage.sql.exec(
      "DELETE FROM qa_logins WHERE expires<=?",
      Date.now(),
    );
    return !!this.ctx.storage.sql
      .exec("SELECT 1 FROM qa_logins WHERE hash=?", sessionHash)
      .toArray().length;
  }
  logout(sessionHash: string) {
    this.ctx.storage.sql.exec(
      "DELETE FROM qa_logins WHERE hash=?",
      sessionHash,
    );
  }
  async manage(action: string, id?: string) {
    const result = await this.feedbackManage(
      action === "open" ? "start" : action,
      {
        mode: "questions",
        prompt: "What would you like to ask?",
        ...(id ? { id } : {}),
      },
    );
    return "error" in result ? result : this.privateSession();
  }
}
