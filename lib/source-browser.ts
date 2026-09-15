import { readdir, realpath, lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { createHash } from "node:crypto";

const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".html",
  ".css",
  ".json",
  ".md",
  ".sql",
  ".toml",
  ".yaml",
  ".yml",
]);
const excluded =
  /^(node_modules|dist|build|coverage|vendor|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|secret|credential|token|private.?key/i;
const allowed = (name: string) => !name.startsWith(".") && !excluded.test(name);
const limit = 128 * 1024;
export async function listSource(workspace: string) {
  const root = await realpath(workspace);
  const files: string[] = [];
  let scanned = 0;
  async function walk(folder: string, depth: number) {
    if (depth > 8 || scanned > 3000) return;
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (++scanned > 3000) break;
      if (!allowed(entry.name) || entry.isSymbolicLink()) continue;
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) await walk(path, depth + 1);
      else if (entry.isFile() && extensions.has(extname(entry.name)))
        files.push(relative(root, path));
    }
  }
  await walk(root, 0);
  return { files: files.sort(), truncated: scanned > 3000 };
}
export async function readSource(workspace: string, path: string) {
  const parts = path.split("/");
  if (
    !path ||
    parts.some((p) => !allowed(p) || p === ".." || !p || p.includes("\\")) ||
    !extensions.has(extname(path))
  )
    throw new Error("Choose an application source file");
  const root = await realpath(workspace);
  let target = root;
  for (const part of parts) {
    target = resolve(target, part);
    if ((await lstat(target)).isSymbolicLink())
      throw new Error("Source links are not available");
  }
  const canonical = await realpath(target);
  if (!canonical.startsWith(root + "/"))
    throw new Error("Source must stay inside the app workspace");
  const file = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > limit)
      throw new Error("Choose a text source file under 128 KiB");
    const buffer = Buffer.alloc(limit + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > limit || buffer.subarray(0, bytesRead).includes(0))
      throw new Error("Choose a text source file under 128 KiB");
    const text = buffer.subarray(0, bytesRead).toString("utf8");
    return {
      path,
      text,
      revision: createHash("sha256").update(text).digest("hex"),
    };
  } finally {
    await file.close();
  }
}
export function sourceExcerpt(
  source: Awaited<ReturnType<typeof readSource>>,
  revision: string,
  start: number,
  end: number,
) {
  if (source.revision !== revision)
    throw new Error("This file changed. Reload and review it before sharing.");
  const lines = source.text.split(/\r?\n/);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < start ||
    end > lines.length ||
    end - start >= 12
  )
    throw new Error("Select between 1 and 12 lines");
  const excerpt = lines.slice(start - 1, end);
  if (excerpt.some((line) => line.replace(/\t/g, "    ").length > 72))
    throw new Error(
      "Select shorter lines so the code remains legible on the slide",
    );
  const fence = "`".repeat(
    Math.max(
      3,
      ...excerpt.flatMap((line) =>
        [...line.matchAll(/`+/g)].map((match) => match[0].length + 1),
      ),
    ),
  );
  return `${fence}${extname(source.path).slice(1)}\n${excerpt.join("\n")}\n${fence}`;
}
