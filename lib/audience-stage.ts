import type { Fetcher } from "../shared/models.ts";
import type { Stage } from "../shared/models.ts";
// Only the already-published stage crosses this boundary.
export function audienceStage(state: Partial<Stage>): Partial<Stage> {
  const result: Partial<Stage> = {};
  for (const key of [
    "live",
    "act",
    "mode",
    "title",
    "html",
    "source",
    "diagram",
    "demoUrl",
    "version",
    "theme",
    "blank",
    "build",
  ] as const) {
    if (state[key] !== undefined)
      Object.assign(result, { [key]: structuredClone(state[key]) });
  }
  if (result.mode === "demo") {
    let publicUrl = false;
    try {
      const u = new URL(result.demoUrl ?? "");
      publicUrl =
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.hash &&
        !u.search &&
        !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(
          u.hostname,
        );
    } catch {}
    if (!publicUrl) {
      result.mode = "material";
      result.demoUrl = "";
      result.html =
        "<p>This app is running on the lecturer’s machine. Follow the projected demonstration.</p>";
    }
  }
  return result;
}

export class AudienceStageSync {
  origin?: string;
  token?: string;
  fetcher: Fetcher;
  sent: string;
  pending: string;
  busy: boolean;
  error: string;
  closed: boolean;
  timer?: ReturnType<typeof setTimeout> | null;

  constructor({
    origin,
    token,
    fetcher = fetch,
  }: { origin?: string; token?: string; fetcher?: Fetcher } = {}) {
    this.origin = origin;
    this.token = token;
    this.fetcher = fetcher;
    this.sent = "";
    this.pending = "";
    this.busy = false;
    this.error = "";
    this.closed = false;
  }
  publish(state: Partial<Stage>) {
    if (!this.origin || !this.token || this.closed) return;
    this.pending = JSON.stringify(audienceStage(state));
    if (!this.timer) void this.flush();
  }
  async deliver(state: Partial<Stage>) {
    if (!this.origin || !this.token) return;
    const body = JSON.stringify(audienceStage(state));
    this.error = "";
    this.publish(state);
    const deadline = Date.now() + 12000;
    while (this.sent !== body) {
      if (this.error || this.closed || Date.now() > deadline)
        throw new Error(this.error || "Audience update not confirmed");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  async flush() {
    clearTimeout(this.timer ?? undefined);
    this.timer = null;
    if (this.busy || this.closed || !this.pending || this.pending === this.sent)
      return;
    this.busy = true;
    const body = this.pending;
    try {
      const response = await this.fetcher(this.origin + "/presenter/stage", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + this.token,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      await response.body?.cancel();
      if (!response.ok)
        throw new Error("Audience sync failed (" + response.status + ")");
      this.sent = body;
      this.error = "";
    } catch {
      this.error = "Audience sync unavailable · retrying";
    } finally {
      this.busy = false;
    }
    if (!this.closed && this.pending !== this.sent)
      this.timer = setTimeout(() => void this.flush(), this.error ? 3000 : 0);
  }
  close() {
    this.closed = true;
    clearTimeout(this.timer ?? undefined);
  }
}
