import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sections } from "../lib/material.ts";
import { authoringMarkdown, parsePresentation } from "../lib/presentation.ts";
import { renderHandout } from "../lib/handout.ts";

test("the full authored lecture round-trips without changing its structure or private notes", async () => {
  const deck = parsePresentation(
    sections(
      await readFile("docs/presentations/web-development-2026.md", "utf8"),
    ),
  );
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
  const html = renderHandout(deck);
  for (const step of deck.steps) {
    if (step.notes) assert.ok(!html.includes(step.notes));
    if (step.type === "build" && step.body)
      assert.ok(!html.includes(step.body));
  }
});

test("ordinary Markdown edits and slide order drive the loaded presentation", () => {
  const markdown =
    '# My lecture\n\n## Presentation\n\n```json\n{"version":1,"title":"Mine"}\n```\n\n## Slide: My example\n\n```json\n{"id":"example"}\n```\n\nMy **own** explanation.\n\n<!-- speaker-notes -->\n\nPrivate experience.\n\n## Slide: Takeaway\n\n```json\n{"id":"takeaway"}\n```\n\nOne clear point.\n';
  const deck = parsePresentation(sections(markdown));
  assert.equal(deck.start, "example");
  assert.equal(deck.steps[0]?.next, "takeaway");
  assert.equal(deck.steps[0]?.body, "My **own** explanation.");
  assert.equal(deck.steps[0]?.notes, "Private experience.");
  assert.ok(!renderHandout(deck).includes("Private experience"));
  assert.throws(
    () =>
      parsePresentation(
        sections(markdown.replace('"id":"takeaway"', '"id":"example"')),
      ),
    /duplicate/,
  );
});
