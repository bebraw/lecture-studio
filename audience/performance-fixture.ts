import { unstable_dev } from "wrangler";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import type { Stage } from "../shared/models.ts";

export async function audienceFixture(stage: Stage) {
  const token = randomBytes(32).toString("hex");
  // Wrangler custom builds resolve from cwd when started through its API.
  const previousDirectory = process.cwd();
  process.chdir(fileURLToPath(new URL(".", import.meta.url)));
  const worker = await unstable_dev(
    fileURLToPath(new URL("worker.ts", import.meta.url)),
    {
      config: fileURLToPath(new URL("wrangler.jsonc", import.meta.url)),
      envFiles: [],
      ip: "127.0.0.1",
      port: 0,
      inspectorPort: 0,
      local: true,
      persist: false,
      vars: { PRESENTER_TOKEN: token },
      logLevel: "error",
      experimental: {
        forceLocal: true,
        watch: false,
        disableDevRegistry: true,
        disableExperimentalWarning: true,
      },
    },
  ).finally(() => process.chdir(previousDirectory));
  try {
    const response = await worker.fetch("/presenter/stage", {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...stage, live: true }),
    });
    if (!response.ok)
      throw new Error(
        `Performance fixture publication failed: ${response.status}`,
      );
    return { url: `http://127.0.0.1:${worker.port}/`, stop: worker.stop };
  } catch (error) {
    await worker.stop();
    throw error;
  }
}
