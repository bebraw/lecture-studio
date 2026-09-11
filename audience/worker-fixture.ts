import { unstable_dev } from "wrangler";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

export async function workerFixture() {
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
  return {
    url: `http://127.0.0.1:${worker.port}/`,
    stop: worker.stop,
    async admin(
      path: string,
      body?: object,
      headers: Record<string, string> = {},
    ) {
      const response = await worker.fetch(path, {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json",
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok)
        throw new Error(
          `Fixture command ${path} failed: ${response.status} ${await response.text()}`,
        );
      return response;
    },
  };
}
