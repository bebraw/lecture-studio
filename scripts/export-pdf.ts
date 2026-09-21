import { resolve } from "node:path";
import { exportPdf } from "./pdf-export.ts";
import type { PdfMode } from "../shared/pdf.ts";
const [source, output, ...args] = process.argv.slice(2);
const options: { aspectRatio?: "16:9" | "4:3"; mode?: PdfMode } = {};
const usage =
  "Usage: npm run export:pdf -- <presentation.md> <output.pdf> [--aspect 16:9|4:3] [--mode presentation|publication]";
if (!source || !output || args.length % 2) throw new Error(usage);
const seen = new Set<string>();
for (let i = 0; i < args.length; i += 2) {
  const option = args[i]!,
    value = args[i + 1]!;
  if (seen.has(option)) throw new Error(usage);
  seen.add(option);
  if (option === "--aspect" && ["16:9", "4:3"].includes(value))
    options.aspectRatio = value as "16:9" | "4:3";
  else if (
    option === "--mode" &&
    ["presentation", "publication"].includes(value)
  )
    options.mode = value as PdfMode;
  else throw new Error(usage);
}
const result = await exportPdf(resolve(source), resolve(output), options);
console.log(
  `Exported ${options.mode || "presentation"}: ${result.pages} pages (${result.slides} logical slides) to ${resolve(output)}`,
);
