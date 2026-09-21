import { resolve } from "node:path";
import { exportPdf } from "./pdf-export.ts";
const [source, output, ...args] = process.argv.slice(2);
if (
  !source ||
  !output ||
  (args.length &&
    (args.length !== 2 ||
      args[0] !== "--aspect" ||
      !["16:9", "4:3"].includes(args[1]!)))
)
  throw new Error(
    "Usage: npm run export:pdf -- <presentation.md> <output.pdf> [--aspect 16:9|4:3]",
  );
const result = await exportPdf(
  resolve(source),
  resolve(output),
  args[1] ? { aspectRatio: args[1] as "16:9" | "4:3" } : {},
);
console.log(
  `Exported ${result.pages} pages (${result.slides} logical slides) to ${resolve(output)}`,
);
