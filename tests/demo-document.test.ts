import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "parse5";
import { demoDocument } from "../shared/demo-document.ts";

test("demo assembly emits one valid document for full, mixed-case, headless and fragment sources", async () => {
  const sources = [
    await readFile("examples/demos/amdahl.html", "utf8"),
    '<!DOCTYPE HTML><HTML lang="fi"><HEAD><TITLE>Oma otsikko</TITLE><STYLE>p{color:green}</STYLE><SCRIPT>LectureDemo.onState(()=>{})</SCRIPT></HEAD><BODY><p>Preserved body</p></BODY></HTML>',
    '<html lang="sv"><body><p>Preserved body</p><script>LectureDemo.onState(()=>{})</script></body></html>',
    "<p>Preserved body</p><script>LectureDemo.onState(()=>{})</script>",
  ];
  for (const source of sources) {
    for (const controller of [true, false]) {
      const output = demoDocument(source, controller);
      const errors: string[] = [];
      parse(output, { onParseError: (error) => errors.push(error.code) });
      assert.deepEqual(errors, []);
      assert.equal(output.match(/<!doctype /gi)?.length, 1);
      assert.equal(output.match(/<head>/g)?.length, 1);
      assert.equal(output.match(/<meta charset=/g)?.length, 1);
      assert.ok(
        output.indexOf("Content-Security-Policy") <
          output.indexOf("window.LectureDemo="),
      );
      assert.ok(
        output.indexOf("window.LectureDemo=") <
          output.indexOf("LectureDemo.onState("),
      );
      assert.ok(
        output.includes(`const role="${controller ? "controller" : "viewer"}"`),
      );
      assert.match(output, /connect-src 'none'/);
      if (source.includes('lang="fi"')) {
        assert.match(output, /<html lang="fi">/);
        assert.match(output, /<title>Oma otsikko<\/title>/);
        assert.match(output, /<style>p\{color:green\}<\/style>/);
      }
      if (source.includes('lang="sv"'))
        assert.match(output, /<html lang="sv">/);
      if (source.includes("Preserved body"))
        assert.match(output, /<p>Preserved body<\/p>/);
    }
  }
});
