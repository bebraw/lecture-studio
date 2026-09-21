import test from "node:test";
import assert from "node:assert/strict";
import { parsePresentation, authoringMarkdown } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { pdfSlides } from "../lib/pdf-plan.ts";
export const source = `## Presentation

\`\`\`yaml
version: 1
title: Conference export
pdf:
  aspectRatio: '4:3'
\`\`\`

## Slide: Public comparison

\`\`\`yaml
id: comparison
source: Public citation
\`\`\`

A public explanation.

<!-- speaker-notes -->

PRIVATE_NOTES_123

## Slide: Build

\`\`\`yaml
id: build
type: build
\`\`\`

PRIVATE_BUILD_456
`;
test("PDF planning selects only public authored fields and retains export settings", () => {
  const deck = parsePresentation(sections(source));
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
  const pages = pdfSlides(deck);
  assert.equal(pages.length, 2);
  assert.match(JSON.stringify(pages), /Public citation/);
  assert.doesNotMatch(
    JSON.stringify(pages),
    /PRIVATE_|notes|instructions.*PRIVATE/,
  );
  assert.equal(deck.pdf?.aspectRatio, "4:3");
  assert.throws(() =>
    parsePresentation(sections(source.replace("4:3", "1:1"))),
  );
  assert.throws(
    () =>
      pdfSlides(
        parsePresentation(
          sections(
            source.replace(
              "A public explanation.",
              "![Missing](https://example.com/a.png)",
            ),
          ),
        ),
      ),
    /image/,
  );
});

test("PDF reveal pages preserve grouped steps, initial context and logical numbering", () => {
  const deck = parsePresentation(
    sections(
      source.replace(
        "A public explanation.",
        "Context.\n\n::: reveal 1\nFirst.\n:::\n\n::: reveal 1\nGrouped.\n:::\n\n::: reveal 2\nSecond.\n:::",
      ),
    ),
  );
  const pages = pdfSlides(deck);
  assert.equal(pages.length, 4);
  assert.deepEqual(
    pages.slice(0, 3).map((page) => page.stage.reveal?.current),
    [0, 1, 2],
  );
  assert.ok(
    pages.slice(0, 3).every((page) => page.stage.html === pages[0]!.stage.html),
  );
  assert.match(pages[2]!.label, /Slide 1 \/ 2 · Reveal 2 \/ 2/);
  deck.steps[0]!.body = "::: reveal 1\nOnly revealed content.\n:::";
  assert.equal(pdfSlides(deck)[0]!.stage.reveal?.current, 1);
});
