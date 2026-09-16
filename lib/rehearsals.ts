import { record } from "../shared/errors.ts";
import { preparePreview } from "./prepare-preview.ts";
import type { ExecFileOptions } from "node:child_process";
type Run = (
  command: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<{ stdout: string | Buffer }>;
import { asError } from "../shared/errors.ts";
import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export const START_COMMIT = "6a5dae4e7bf7b0b510c525a91497cd6620869bbc";
export async function validateWorkspace(workspace: string, run: Run = exec) {
  const path = await realpath(resolve(workspace)).catch(() => {
    throw new Error(
      "The builder workspace is missing or inaccessible. Create a New rehearsal in Prepare, then reconnect Codex.",
    );
  });
  const controller = await realpath(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  if (path === controller || controller.startsWith(path + "/"))
    throw new Error(
      "The builder cannot use the studio checkout or its parent. Create a New rehearsal first.",
    );
  try {
    await run("git", ["merge-base", "--is-ancestor", START_COMMIT, "HEAD"], {
      cwd: path,
      timeout: 5000,
    });
    const manifest = record(
      JSON.parse(await readFile(join(path, "package.json"), "utf8")),
    );
    if (!record(manifest.scripts).dev)
      throw new Error("Missing starter dev command");
  } catch {
    throw new Error(
      "Select a checkout based on the reviewed lecture starter, or create a New rehearsal first.",
    );
  }
  return path;
}
export class Rehearsals {
  root: string;
  run: Run;
  constructor(root: string, run: Run = exec) {
    this.root = root;
    this.run = run;
  }
  async create() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    let folder;
    for (let i = 1; ; i++) {
      folder = join(this.root, "rehearsal-" + String(i).padStart(3, "0"));
      try {
        await mkdir(folder);
        break;
      } catch (caught) {
        const e = asError(caught);
        if (e.code !== "EEXIST") throw e;
      }
    }
    // Never reuse or erase a prior attempt, including failed clones.
    await this.run(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        "lecture-start-v10",
        "https://github.com/bebraw/webdev-through-ages.git",
        folder,
      ],
      { timeout: 120000 },
    );
    const { stdout } = await this.run("git", ["rev-parse", "HEAD"], {
      cwd: folder,
    });
    if (stdout.toString().trim() !== START_COMMIT)
      throw new Error(
        "Starter tag no longer matches the reviewed commit; checkout retained for inspection.",
      );
    await this.run("git", ["switch", "-c", "rehearsal"], { cwd: folder });
    await preparePreview(folder);
    await this.run("npm", ["ci"], {
      cwd: folder,
      timeout: 180000,
      maxBuffer: 2000000,
    });
    await writeFile(
      join(this.root, "current.json"),
      JSON.stringify({ workspace: folder }),
      { mode: 0o600 },
    );
    return folder;
  }
  async current(fallback: string) {
    try {
      const { workspace } = record(
        JSON.parse(await readFile(join(this.root, "current.json"), "utf8")),
      );
      if (
        typeof workspace !== "string" ||
        !/^rehearsal-\d+$/.test(workspace.slice(this.root.length + 1)) ||
        !workspace.startsWith(resolve(this.root) + "/")
      )
        return fallback;
      return workspace;
    } catch {
      return fallback;
    }
  }
}
