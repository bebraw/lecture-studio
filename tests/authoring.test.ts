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

test("documented YAML examples load together and retain nested settings", async () => {
  const guide = await readFile("docs/obsidian-authoring.md", "utf8");
  const examples = [
    ...guide.matchAll(/(`{4,}|~{4,})markdown\n([\s\S]*?)\n\1/g),
  ].map((match) => match[2]);
  assert.equal(examples.length, 3);
  const deck = parsePresentation(sections(examples.join("\n\n")));
  assert.equal(deck.steps.length, 8);
  assert.equal(
    deck.steps.find((step) => step.id === "theme-vote")?.poll?.options.length,
    3,
  );
  assert.match(
    deck.steps.find((step) => step.id === "build-needs")?.wordsInstruction ||
      "",
    /Map these needs/,
  );
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
});

test("YAML rejects ambiguous settings and preserves JSON compatibility", () => {
  const note = (metadata: string, language = "yaml") =>
    sections(
      "# Test\n\n## Presentation\n\n```yml\nversion: 1\ntitle: Test\n```\n\n## Slide: Example\n\n```" +
        language +
        "\n" +
        metadata +
        "\n```\n\nMarkdown body.\n",
    );
  assert.equal(
    parsePresentation(note("id: example\nwordCloud: true")).steps[0]?.wordCloud,
    true,
  );
  assert.equal(
    parsePresentation(note('{"id":"example"}', "json")).start,
    "example",
  );
  for (const metadata of [
    "id: example\nid: other",
    'id: example\nwordCloud: "true"',
    "id: example\nwordClod: true",
    "id: example\nchapter: &chapter Test\nsource: *chapter",
    "id: !custom example",
    "id: example\nrelated: [missing]",
    "id: example\npoll: [",
    "id: example\ntitle: Wrong place",
  ])
    assert.throws(() => parsePresentation(note(metadata)), metadata);
});
