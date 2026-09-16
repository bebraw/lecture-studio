import { readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";

/** Adapt only the reviewed starter entry point; keep its implementation intact. */
export async function preparePreview(workspace: string) {
  const configPath = join(workspace, "wrangler.jsonc");
  const config = await readFile(configPath, "utf8");
  if (!/"main"\s*:\s*"src\/(?:worker|lecture-preview)\.ts"/.test(config))
    throw new Error(
      "Unknown rehearsal entry point; preview setup requires review",
    );
  await copyFile(
    new URL("../shared/preview-framing.ts", import.meta.url),
    join(workspace, "src/lecture-preview-policy.ts"),
  );
  await writeFile(
    join(workspace, "src/lecture-preview.ts"),
    `// Studio-owned local preview adapter. Public deployment keeps the app's original framing policy.
import worker from "./worker";
import { previewFraming } from "./lecture-preview-policy";
export * from "./worker";
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return previewFraming(request, await worker.fetch(request, env));
  },
};
`,
  );
  await writeFile(
    configPath,
    config.replace(
      /("main"\s*:\s*)"src\/worker\.ts"/,
      '$1"src/lecture-preview.ts"',
    ),
  );
}
