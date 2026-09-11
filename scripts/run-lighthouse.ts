import * as v from "valibot";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performanceFixture } from "./performance-fixture.ts";

import {
  budgetFailures,
  type PerformanceMetrics,
} from "./performance-budgets.ts";

const metricsSchema = v.object({
  lcpMs: v.number(),
  cls: v.number(),
  tbtMs: v.number(),
  transferBytes: v.number(),
});
const budgets = v.parse(
  v.object({ audience: metricsSchema, stage: metricsSchema }),
  JSON.parse(
    await readFile(
      new URL("../performance-budgets.json", import.meta.url),
      "utf8",
    ),
  ),
);
const output = new URL("../reports/performance/", import.meta.url);
await mkdir(output, { recursive: true });
const fixture = await performanceFixture();
const summaries = [];
const failures: string[] = [];
try {
  for (const name of ["audience", "stage"] as const) {
    const runs: PerformanceMetrics[] = [];
    for (let run = 1; run <= 3; run++) {
      const chrome = await launch({
        chromePath: chromium.executablePath(),
        chromeFlags: [
          "--headless",
          "--disable-dev-shm-usage",
          ...(process.env.CI ? ["--no-sandbox"] : []),
        ],
      });
      try {
        const result = await lighthouse(fixture[name], {
          port: chrome.port,
          output: ["json", "html"],
          logLevel: "error",
          onlyCategories: ["performance"],
          ...(name === "stage"
            ? {
                formFactor: "desktop",
                screenEmulation: {
                  mobile: false,
                  width: 1920,
                  height: 1080,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
              }
            : {}),
        });
        if (!result || result.lhr.runtimeError)
          throw new Error(
            result?.lhr.runtimeError?.message ??
              "Lighthouse produced no report",
          );
        const metric = (id: string) => {
          const value = result.lhr.audits[id]?.numericValue;
          if (value === undefined)
            throw new Error(`Missing Lighthouse metric: ${id}`);
          return value;
        };
        const reports = result.report;
        if (!Array.isArray(reports) || !reports[0] || !reports[1])
          throw new Error("Missing JSON/HTML reports");
        await writeFile(new URL(`${name}-${run}.json`, output), reports[0]);
        await writeFile(new URL(`${name}-${run}.html`, output), reports[1]);
        runs.push({
          lcpMs: metric("largest-contentful-paint"),
          cls: metric("cumulative-layout-shift"),
          tbtMs: metric("total-blocking-time"),
          transferBytes: metric("total-byte-weight"),
        });
        console.log(
          `${name} ${run}/3: LCP ${Math.round(metric("largest-contentful-paint"))}ms, CLS ${metric("cumulative-layout-shift")}, bytes ${metric("total-byte-weight")}`,
        );
      } finally {
        chrome.kill();
      }
    }
    const median = (key: keyof (typeof runs)[number]) => {
      const value = runs.map((run) => run[key]).sort((a, b) => a - b)[1];
      if (value === undefined) throw new Error("Three measurements required");
      return value;
    };
    const metrics = {
      lcpMs: median("lcpMs"),
      cls: median("cls"),
      tbtMs: median("tbtMs"),
      transferBytes: median("transferBytes"),
    };
    failures.push(
      ...budgetFailures(metrics, budgets[name]).map(
        (message) => name + ": " + message,
      ),
    );
    summaries.push({
      page: name,
      ...metrics,
      runs,
    });
  }
  await writeFile(
    new URL("summary.json", output),
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        pages: summaries,
      },
      null,
      2,
    ) + "\n",
  );
  if (failures.length) {
    console.warn(failures.join("\n"));
    if (process.argv.includes("--enforce")) process.exitCode = 1;
  }
  console.log(
    "Performance reports saved to reports/performance." +
      (process.argv.includes("--enforce")
        ? " Budget enforcement enabled."
        : " Results are advisory."),
  );
} finally {
  await fixture.stop();
}
