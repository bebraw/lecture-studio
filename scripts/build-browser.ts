import { build } from "esbuild";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const entries = (await readdir(new URL("../public", import.meta.url)))
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
  .map((name) => "public/" + name);
await build({
  absWorkingDir: root,
  entryPoints: [...entries, "audience/audience.ts"],
  outdir: ".local/browser",
  outbase: ".",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  external: ["/vendor/*"],
  outExtension: { ".js": ".mjs" },
});
