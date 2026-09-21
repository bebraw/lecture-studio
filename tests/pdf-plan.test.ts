import { loadPresentationImages } from "../lib/presentation-images.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { parsePresentation, authoringMarkdown } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { pdfSlides, publicationDeck } from "../lib/pdf-plan.ts";
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

test("demo sequence validation requires explicit states or images and public captions", () => {
  const deck = parsePresentation(sections(source));
  deck.steps[0]!.demo = "./order.html";
  deck.steps[0]!.demoSequence = [
    { state: '{"status":"ready"}', caption: "Ready to cancel" },
    { image: "./result.svg", caption: "The result" },
  ];
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
  assert.throws(() => pdfSlides(deck), /missing demo visual/);
  delete deck.steps[0]!.demo;
  assert.throws(
    () => parsePresentation(sections(authoringMarkdown(deck))),
    /state frames require/,
  );
});

test("publication replacements are public, preserve sources, and remove session identity", () => {
  const deck = parsePresentation(sections(source));
  deck.identity = {
    presenter: "Presenter",
    joinUrl: "https://example.org/session",
    qrCode: "./session.png",
  };
  deck.steps[0]!.publication = {
    body: "Public replacement.",
    explanation: "Public independent explanation.",
  };
  deck.steps[1]!.publication = { omit: true };
  const publication = publicationDeck(deck);
  const pages = pdfSlides(publication, {}, "publication");
  assert.equal(pages.length, 1);
  assert.match(pages[0]!.stage.html!, /Public replacement/);
  assert.match(pages[0]!.stage.html!, /Public independent explanation/);
  assert.equal(pages[0]!.stage.source, "Public citation");
  assert.doesNotMatch(
    JSON.stringify(pages),
    /PRIVATE_|session.png|example.org\/session/,
  );
  assert.equal(deck.identity.qrCode, "./session.png");
  deck.pdf = {
    publicationIdentity: {
      joinUrl: "https://example.org/paper",
      qrCode: "./paper.png",
    },
  };
  assert.equal(publicationDeck(deck).identity?.qrCode, "./paper.png");
  assert.equal(publicationDeck(deck).identity?.presenter, "Presenter");
  deck.steps[0]!.publication = { omit: true };
  assert.throws(() => publicationDeck(deck), /every slide/);
});

test("static demo frame images need no executable demo and preserve frame order", async () => {
  const deck = parsePresentation(sections(source));
  deck.steps[0]!.demoSequence = [
    { image: "./one.svg", caption: "First state" },
    { image: "./two.svg", caption: "Second state" },
  ];
  await loadPresentationImages(deck, async () =>
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
    ),
  );
  const pages = pdfSlides(deck);
  assert.equal(pages.length, 3);
  assert.match(pages[0]!.stage.html!, /First state/);
  assert.match(pages[1]!.stage.html!, /Second state/);
  assert.match(pages[0]!.stage.html!, /data:image\/svg\+xml;base64/);
});
