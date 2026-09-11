import { execFileSync } from "node:child_process";

const zero = /^0+$/;
export function affectedFiles(
  root: string,
  pushInput?: string,
): string[] | null {
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const names = (...args: string[]) =>
    git(...args)
      .split("\0")
      .filter(Boolean);
  const files = new Set<string>();
  const add = (paths: string[]) => paths.forEach((path) => files.add(path));
  if (pushInput !== undefined) {
    for (const line of pushInput.split("\n").filter(Boolean)) {
      const [, local, , remote] = line.trim().split(/\s+/);
      if (!local || !remote) throw new Error("Malformed pre-push input");
      if (zero.test(local)) continue; // Deleting a remote ref publishes no code.
      if (local !== git("rev-parse", "HEAD^{commit}").trim())
        throw new Error(
          "Check out the commit being pushed before running its quality checks",
        );
      if (zero.test(remote)) return null; // New branch: check everything.
      try {
        add(
          names(
            "diff",
            "--name-only",
            "--no-renames",
            "-z",
            remote,
            local,
            "--",
          ),
        );
      } catch {
        return null; // Remote history unavailable: never silently skip checks.
      }
    }
  } else {
    try {
      const upstream = git("rev-parse", "--verify", "@{upstream}").trim();
      add(
        names(
          "diff",
          "--name-only",
          "--no-renames",
          "-z",
          upstream,
          "HEAD",
          "--",
        ),
      );
    } catch {
      return null;
    }
  }
  add(names("diff", "--name-only", "--no-renames", "-z", "HEAD", "--"));
  add(names("ls-files", "--others", "--exclude-standard", "-z"));
  return [...files].sort();
}

export function affectedChecks(files: string[] | null): string[] {
  if (files === null) return ["check"];
  if (!files.length) return [];
  if (files.every((path) => path.endsWith(".md"))) return ["format:check"];
  // Configuration, dependencies and unknown file types take the full gate.
  if (
    files.some(
      (path) =>
        !/^(?:server\.ts|(?:lib|shared|public|audience|tests|browser-tests|document-a)\/.*\.(?:ts|css|html))$/.test(
          path,
        ),
    )
  )
    return ["check"];
  const checks = [
    "format:check",
    "typecheck",
    "lint",
    "quality:architecture",
    "test:coverage",
  ];
  if (files.some((path) => path.startsWith("audience/")))
    checks.push("build:worker");
  if (
    files.some(
      (path) =>
        /^(?:public|browser-tests|shared|lib)\//.test(path) ||
        path === "server.ts",
    )
  )
    checks.push("test:browser");
  return checks;
}
