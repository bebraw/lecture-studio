import {
  mkdir,
  copyFile,
  cp,
  stat,
  rm,
  appendFile,
  readFile,
} from "node:fs/promises";
await import("../scripts/build-browser.ts");
const root = new URL("../", import.meta.url),
  output = new URL(".local/audience/assets/", root);
// This directory is generated exclusively by this script, never user content.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ["slides.html", "slides.mjs"])
  await copyFile(
    new URL(".local/browser/public/" + name, root),
    new URL(name, output),
  );
await copyFile(
  new URL("public/slides.css", root),
  new URL("slides.css", output),
);
// Deliberate allowlist: never publish the desk, notes, configuration or secrets.
for (const name of ["shared.mjs", "style.css", "identity.css", "reveals.css"])
  await copyFile(
    new URL(
      (name.endsWith(".mjs") ? ".local/browser/public/" : "public/") + name,
      root,
    ),
    new URL(name, output),
  );
for (const name of [
  "index.html",
  "audience.mjs",
  "audience.css",
  "seminar-browser.mjs",
])
  await copyFile(
    new URL(
      name.endsWith(".mjs") ? "../.local/browser/audience/" + name : name,
      import.meta.url,
    ),
    new URL(name, output),
  );
await copyFile(
  new URL("../document-a/style.css", import.meta.url),
  new URL("room.css", output),
);
await appendFile(
  new URL("room.css", output),
  await readFile(new URL("room.css", import.meta.url)),
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

await cp(
  new URL("public/lecture-assets/", root),
  new URL("lecture-assets/", output),
  { recursive: true },
);
await copyFile(
  new URL("public/hypotheses.html", root),
  new URL("hypotheses.html", output),
);
