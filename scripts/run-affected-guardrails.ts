import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { affectedChecks, affectedFiles } from "./affected-files.ts";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const files = affectedFiles(
  root,
  process.argv.includes("--pre-push") ? readFileSync(0, "utf8") : undefined,
);
const checks = affectedChecks(files);
console.log(
  files === null
    ? "Unknown change scope: full quality gate."
    : `${files.length} changed file(s).`,
);
console.log(
  checks.length ? `Checks: ${checks.join(", ")}` : "No changes to check.",
);
if (!process.argv.includes("--dry-run")) {
  for (const check of checks) {
    const result = spawnSync("npm", ["run", check], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
