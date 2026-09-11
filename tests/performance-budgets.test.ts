import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetFailures } from "../scripts/performance-budgets.ts";

test("performance budgets accept their limit and report individual regressions", () => {
  const budget = { lcpMs: 2000, cls: 0.05, tbtMs: 100, transferBytes: 22000 };
  assert.deepEqual(budgetFailures(budget, budget), []);
  assert.deepEqual(
    budgetFailures({ ...budget, lcpMs: 2001, transferBytes: 23000 }, budget),
    ["lcpMs: 2001 exceeds 2000", "transferBytes: 23000 exceeds 22000"],
  );
  assert.throws(
    () => budgetFailures({ ...budget, cls: NaN }, budget),
    /Invalid/,
  );
});
