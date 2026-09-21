import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "valibot";
import { renderMarkdown, sections } from "../lib/material.ts";
import { revealTotal } from "../lib/reveals.ts";
import {
  parsePresentation,
  PresentationSession,
  authoringMarkdown,
} from "../lib/presentation.ts";
import { renderHandout } from "../lib/handout.ts";
import { studySteps } from "../lib/study-export.ts";
import { revealStateSchema } from "../shared/reveals.ts";
const source = await readFile("examples/progressive-reveals.md", "utf8");
const deck = () => parsePresentation(sections(source));

test("reveal blocks group safely, preserve Markdown and annotate table body rows", () => {
  const definition = deck();
  const step = definition.steps[0]!;
  const html = renderMarkdown(step.body, { reveals: step.reveals });
  assert.equal(revealTotal(html), 3);
  assert.equal((html.match(/data-reveal-step="1"/g) || []).length, 2);
  assert.equal((html.match(/data-reveal-emphasis="2"/g) || []).length, 2);
  assert.match(html, /<tr data-reveal-emphasis="3">/);
  assert.doesNotMatch(html, /<thead[^]*?data-reveal[^]*?<\/thead>/);
  assert.deepEqual(
    parsePresentation(sections(authoringMarkdown(definition))),
    definition,
  );
  assert.match(
    renderMarkdown("::: reveal 1\n<script>alert(1)</script>\n:::"),
    /&lt;script&gt;/,
  );
  assert.equal(
    revealTotal(renderMarkdown("```text\n::: reveal 1\ntext\n:::\n```")),
    0,
  );
  assert.match(
    renderMarkdown("::: reveal 1\n```text\n:::\n```\n:::"),
    /<code class="language-text">:::/,
  );
  assert.doesNotMatch(renderHandout(definition), /reveal-pending|aria-hidden/);
  assert.equal(studySteps(definition)[0]!.revealTotal, 3);
  assert.equal(studySteps(definition)[1]!.revealTotal, undefined);
});

test("Next and Previous reverse reveals before changing slides, including first and last boundaries", () => {
  const session = new PresentationSession(deck(), "example");
  assert.deepEqual(session.reveal(), { current: 0, total: 3 });
  session.navigate("previous");
  assert.equal(session.reveal()?.current, 0);
  for (let current = 1; current <= 3; current++) {
    session.navigate("next");
    assert.equal(session.current, "comparison");
    assert.equal(session.state().preview.reveal?.current, current);
  }
  session.navigate("next");
  assert.equal(session.current, "summary");
  assert.equal(session.reveal(), undefined);
  session.navigate("previous");
  assert.deepEqual(session.reveal(), { current: 3, total: 3 });
  session.navigate("previous");
  assert.equal(session.reveal()?.current, 2);
  session.move("select", "comparison");
  assert.equal(session.reveal()?.current, 0);
  session.move("next");
  assert.equal(session.reveal()?.current, 1);
  session.move("previous");
  assert.equal(session.reveal()?.current, 0);
  session.move("select", "closing");
  session.navigate("next");
  session.navigate("next");
  assert.equal(session.current, "closing");
  assert.equal(session.reveal()?.current, 1);
  session.navigate("previous");
  assert.equal(session.reveal()?.current, 0);
  session.navigate("previous");
  assert.equal(session.current, "summary");
});

test("invalid reveals fail preparation rather than dropping content or inventing steps", () => {
  for (const body of [
    "::: reveal 0\ntext\n:::",
    "::: reveal 21\ntext\n:::",
    "::: reveal x\ntext\n:::",
    "::: reveal 2\ntext\n:::",
    "::: reveal 1\ntext",
    "::: reveal 1\n:::",
    "::: reveal 1\n::: reveal 2\ntext\n:::\n:::",
  ])
    assert.throws(() => renderMarkdown(body));
  const table = "| A | B |\n|---|---|\n| one | two |";
  for (const rows of [
    { step: 1, table: 2, rows: [1] },
    { step: 1, table: 1, rows: [2] },
  ])
    assert.throws(
      () => renderMarkdown(table, { reveals: { rows: [rows] } }),
      /missing/,
    );
  assert.throws(
    () =>
      renderMarkdown("::: reveal 2\n" + table + "\n:::", {
        reveals: { rows: [{ step: 1, table: 1, rows: [1] }] },
      }),
    /before emphasizing/,
  );
  assert.throws(() => parse(revealStateSchema, { current: 4, total: 3 }));
  assert.throws(
    () =>
      parsePresentation(
        sections(source.replace("type: material", "type: build")),
      ),
    /reveals/,
  );
});
