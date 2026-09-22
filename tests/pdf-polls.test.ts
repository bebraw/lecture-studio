import test from "node:test";
import assert from "node:assert/strict";
import { parsePresentation } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { pdfSlides, publicationDeck } from "../lib/pdf-plan.ts";

export const pollSource = `## Presentation
\`\`\`yaml
version: 1
title: Poll export reproduction
\`\`\`

## Slide: Predict the outcome
\`\`\`yaml
id: prediction
type: poll
room: pdf-export-test
poll:
  question: Does a visible cancellation control guarantee success?
  options:
    - id: guaranteed
      label: Yes, because the control is visible
    - id: revalidate
      label: No, the server must revalidate
  defaultId: revalidate
\`\`\`

Consider what happens when the resource changes after the page was loaded.
`;

test("both PDF modes retain metadata polls as ordered plain choices without an answer key", () => {
  const deck = parsePresentation(sections(pollSource));
  for (const mode of ["presentation", "publication"] as const) {
    const pages = pdfSlides(
      mode === "publication" ? publicationDeck(deck) : deck,
      {},
      mode,
    );
    assert.equal(pages.length, 1);
    assert.equal(pages[0]!.stage.title, "Predict the outcome");
    assert.equal(
      pages[0]!.stage.html,
      "<p>Does a visible cancellation control guarantee success?</p>" +
        "<ul><li>Yes, because the control is visible</li><li>No, the server must revalidate</li></ul>" +
        "<p>Consider what happens when the resource changes after the page was loaded.</p>\n",
    );
    assert.doesNotMatch(
      JSON.stringify(pages),
      /defaultId|guaranteed|pdf-export-test|selected|checked/,
    );
  }
  deck.steps[0]!.poll!.defaultId = "guaranteed";
  const before = pdfSlides(deck);
  deck.steps[0]!.poll!.defaultId = "revalidate";
  assert.deepEqual(pdfSlides(deck), before);
  deck.steps[0]!.title = deck.steps[0]!.poll!.question;
  assert.doesNotMatch(pdfSlides(deck)[0]!.stage.html!, /Does a visible/);
  deck.steps[0]!.poll!.options[0]!.label = "<script>bad</script> & **plain**";
  assert.match(
    pdfSlides(deck)[0]!.stage.html!,
    /&lt;script&gt;bad&lt;\/script&gt; &amp; \*\*plain\*\*/,
  );
});

test("publication explanations retain polls while explicit replacements and omissions win", () => {
  const deck = parsePresentation(sections(pollSource));
  deck.steps.push({
    id: "ordinary",
    type: "material",
    title: "Ordinary",
    body: "Unchanged.",
  });
  deck.steps[0]!.publication = { explanation: "A public explanation." };
  const render = () => pdfSlides(publicationDeck(deck), {}, "publication");
  assert.match(render()[0]!.stage.html!, /Does a visible/);
  assert.match(render()[0]!.stage.html!, /A public explanation/);
  for (const body of ["Replacement activity.", ""]) {
    deck.steps[0]!.publication = { body };
    assert.doesNotMatch(render()[0]!.stage.html!, /Does a visible|<li>/);
    assert.equal(
      render()[0]!.stage.html,
      body ? "<p>Replacement activity.</p>\n" : "",
    );
  }
  deck.steps[0]!.publication = { omit: true };
  assert.equal(render().length, 1);
  assert.equal(render()[0]!.stage.html, "<p>Unchanged.</p>\n");
  assert.ok(deck.steps[0]!.poll);
});
