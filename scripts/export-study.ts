import { resolve } from "node:path";
import { exportStudy } from "../lib/study-export.ts";
const [config, output, ...extra] = process.argv.slice(2);
if (!config || !output || extra.length)
  throw new Error(
    "Usage: npm run export:study -- <course.json> <new-output-directory>",
  );
const course = await exportStudy(resolve(config), resolve(output));
console.log(
  `Exported ${course.modules.length} modules to ${resolve(output)}. Serve over HTTP; deploy the complete directory under any URL prefix.`,
);
