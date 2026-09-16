import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import * as v from "valibot";
import { buildTimingSchema } from "../shared/schemas.ts";
import type { BuildTiming } from "../shared/models.ts";
import { asError } from "../shared/errors.ts";

// Private, bounded history. Prompts, audience responses and preview URLs are not saved.
export class BuildTimings {
  rows: BuildTiming[] = [];
  warning = "";
  private writes = Promise.resolve();
  constructor(private file?: string) {}
  async load() {
    if (!this.file) return;
    try {
      this.rows = v
        .parse(
          v.array(buildTimingSchema),
          JSON.parse(await readFile(this.file, "utf8")),
        )
        .slice(-200);
      for (const row of this.rows)
        if (row.outcome === "running") row.outcome = "unknown";
    } catch (error) {
      if (asError(error).code !== "ENOENT") {
        this.warning =
          "Saved build timings could not be read; the existing file is preserved.";
        this.file = undefined;
      }
    }
  }
  begin(
    step: string,
    title: string,
    model: string,
    prompt: string,
    now = Date.now(),
  ) {
    const row: BuildTiming = {
      id: randomUUID(),
      step,
      title,
      model,
      promptHash: createHash("sha256").update(prompt).digest("hex"),
      startedAt: new Date(now).toISOString(),
      finishedAt: null,
      previewAt: null,
      outcome: "running",
    };
    this.rows.push(row);
    this.rows = this.rows.slice(-200);
    this.save();
    return row;
  }
  preview(id: string, now = Date.now()) {
    const row = this.rows.find((entry) => entry.id === id);
    if (!row || row.previewAt) return;
    row.previewAt = new Date(
      Math.max(now, Date.parse(row.startedAt)),
    ).toISOString();
    this.save();
  }
  finish(
    id: string,
    outcome: "completed" | "failed" | "interrupted",
    now = Date.now(),
  ) {
    const row = this.rows.find((entry) => entry.id === id);
    if (!row || row.outcome !== "running") return;
    row.outcome = outcome;
    row.finishedAt = new Date(
      Math.max(now, Date.parse(row.startedAt)),
    ).toISOString();
    this.save();
  }
  private save() {
    const file = this.file;
    if (!file) return;
    const content = JSON.stringify(this.rows, null, 2);
    this.writes = this.writes
      .then(async () => {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file + ".tmp", content, { mode: 0o600 });
        await rename(file + ".tmp", file);
      })
      .catch(() => {
        this.warning =
          "Build timings are available in memory, but saving failed. Download them before closing.";
      });
  }
  async flush() {
    await this.writes;
  }
}
