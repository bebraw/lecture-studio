import test from "node:test";
import assert from "node:assert/strict";
import {
  loadPresentationImages,
  imageSources,
  imageData,
} from "../lib/presentation-images.ts";
import {
  parsePresentation,
  authoringMarkdown,
  PresentationSession,
} from "../lib/presentation.ts";
import { sections, renderMarkdown } from "../lib/material.ts";
import { renderHandout } from "../lib/handout.ts";
import { studySteps } from "../lib/study-export.ts";
import { audienceStage } from "../lib/audience-stage.ts";

const source =
  "# Test\n## Presentation\n```yaml\nversion: 1\ntitle: Test\n```\n## Slide: Figure\n```yaml\nid: figure\ntype: material\ndemoPoster: ./course figure.svg\n```\n![Course](<./course figure.svg>)";
test("relative SVGs load once and survive preview, reading and study rendering without changing authoring", async () => {
  const deck = parsePresentation(sections(source));
  let reads = 0;
  await loadPresentationImages(deck, async (path) => {
    assert.equal(path, "./course figure.svg");
    reads++;
    return Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
  });
  assert.equal(reads, 1);
  const step = deck.steps[0]!;
  const rendered = renderMarkdown(step.body, {
    imageSources: imageSources(step),
  });
  assert.match(rendered, /src="data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(
    new PresentationSession(deck, "test").state().preview.html,
    /data:image/,
  );
  assert.match(renderHandout(deck), /alt="Demo preview"/);
  assert.match(studySteps(deck)[0]!.posterHtml!, /alt="Demo preview"/);
  assert.doesNotMatch(authoringMarkdown(deck), /base64/);
});
test("relative image reads reject traversal and oversized files", async () => {
  const deck = parsePresentation(sections(source));
  deck.steps[0]!.body = "![Escape](./%2e%2e/private.svg)";
  await assert.rejects(
    loadPresentationImages(deck, async () => {
      throw new Error("Unexpected read");
    }),
    /Invalid presentation image/,
  );
  assert.throws(
    () => imageData("./huge.png", new Uint8Array(2_000_001)),
    /2 MB/,
  );
});
test("large embedded images do not exceed the public audience publication budget", () => {
  const html =
    '<p>Context</p><img src="data:image/png;base64,' +
    "A".repeat(100000) +
    '" alt="Figure">';
  const result = audienceStage({ html });
  assert.match(result.html!, /Context/);
  assert.match(result.html!, /reading copy/);
  assert.ok(JSON.stringify(result).length < 90000);
});
