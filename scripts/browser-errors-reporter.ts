import { stripVTControlCharacters } from "node:util";
import type { FullResult, Reporter } from "@playwright/test/reporter";

/** Runtime errors must fail the suite even when HTTP assertions pass. */
export default class BrowserErrorsReporter implements Reporter {
  private tail = "";
  private failed = false;

  onStdErr(chunk: string | Buffer) {
    // Classify complete lines: the native diagnostic may span several writes.
    const lines = (this.tail + chunk.toString()).split("\n");
    this.tail = lines.pop()!;
    for (const line of lines) this.inspect(line);
  }

  private inspect(line: string) {
    const plain = stripVTControlCharacters(line).trim();
    // Linux workerd logs this when a client disconnects during a response.
    // Keep it visible, but do not turn successful browser assertions into failures.
    // Match the complete native signature, never arbitrary connection-reset errors.
    if (
      /^(?:✘ )?\[ERROR\] kj::getCaughtExceptionAsKj\(\) = kj\/async-io-unix\.c\+\+:\d+: disconnected: ::write\(fd, buffer\.begin\(\), buffer\.size\(\)\): (?:Connection reset by peer|Broken pipe)$/.test(
        plain,
      )
    )
      return;
    if (/\[ERROR\]|\bUncaught (?:Error|TypeError|ReferenceError)\b/.test(plain))
      this.failed = true;
  }

  async onEnd(result: FullResult) {
    this.inspect(this.tail);
    this.tail = "";
    if (!this.failed) return;
    console.error(
      "Browser suite emitted a runtime error; inspect stderr above.",
    );
    return {
      status: result.status === "passed" ? ("failed" as const) : result.status,
    };
  }
}
