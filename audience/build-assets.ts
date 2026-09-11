import { mkdir, copyFile, cp, stat, rm } from "node:fs/promises";
await import("../scripts/build-browser.ts");
const root = new URL("../", import.meta.url),
  output = new URL(".local/audience/assets/", root);
// This directory is generated exclusively by this script, never user content.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Deliberate allowlist: never publish the desk, notes, configuration or secrets.
for (const name of ["shared.mjs", "style.css"])
  await copyFile(
    new URL(
      (name.endsWith(".mjs") ? ".local/browser/public/" : "public/") + name,
      root,
    ),
    new URL(name, output),
  );
for (const name of ["index.html", "audience.mjs", "audience.css"])
  await copyFile(
    new URL(
      name.endsWith(".mjs") ? "../.local/browser/audience/" + name : name,
      import.meta.url,
    ),
    new URL(name, output),
  );
await cp(
  new URL("node_modules/mermaid/dist/", root),
  new URL("vendor/mermaid/", output),
  {
    recursive: true,
    filter: async (source) =>
      (await stat(source)).isDirectory() || /\.(mjs|js|woff2)$/.test(source),
  },
);
