import { test } from "node:test";
import assert from "node:assert/strict";
import { asyncHandler } from "../shared/errors.ts";

test(
  "callback adapters report rejected operations instead of returning unobserved promises",
  { timeout: 1000 },
  async () => {
    let report: (error: Error) => void = () => {};
    const reported = new Promise<Error>((resolve) => {
      report = resolve;
    });
    const handler = asyncHandler(async (value: string) => {
      throw new Error(value);
    }, report);
    assert.equal(handler("Connection failed"), undefined);
    assert.equal((await reported).message, "Connection failed");
  },
);
