import { stripVTControlCharacters } from "node:util";
import type { FullResult, Reporter } from "@playwright/test/reporter";

/** Runtime errors must fail the suite even when HTTP assertions pass. */
export default class BrowserErrorsReporter implements Reporter {
  private tail = "";
  private failed = false;

  onStdErr(chunk: string | Buffer) {
    // Wrangler uses ANSI colours and may split a message across writes.
    const text = this.tail + chunk.toString();
    const plain = stripVTControlCharacters(text);
    if (/\[ERROR\]|\bUncaught (?:Error|TypeError|ReferenceError)\b/.test(plain))
      this.failed = true;
    this.tail = text.slice(-256);
  }

  async onEnd(result: FullResult) {
    if (!this.failed) return;
    console.error(
      "Browser suite emitted a runtime error; inspect stderr above.",
    );
    return {
      status: result.status === "passed" ? ("failed" as const) : result.status,
    };
  }
}
