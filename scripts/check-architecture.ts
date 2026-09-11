import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { record } from "../shared/errors.ts";

// Dead-code findings stay advisory; only forbidden cross-runtime imports block.
const result = spawnSync(
  fileURLToPath(new URL("../node_modules/.bin/fallow", import.meta.url)),
  ["dead-code", "--format", "json", "--no-cache"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
if (result.error) throw result.error;
const report = record(JSON.parse(result.stdout));
const violations = [
  "boundary_violations",
  "boundary_coverage_violations",
  "boundary_call_violations",
].flatMap((key) => {
  const findings = report[key];
  if (!Array.isArray(findings))
    throw new Error("Incomplete Fallow architecture report");
  return findings as unknown[];
});
if (violations.length) {
  console.error(JSON.stringify(violations, null, 2));
  process.exitCode = 1;
} else
  console.log(
    "Architecture boundaries passed: browser, local service, Worker, shared contracts.",
  );
