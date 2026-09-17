import test from "node:test";
import assert from "node:assert/strict";
import { validateDemoState, loadWebDemos } from "../lib/web-demos.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { audienceStage } from "../lib/audience-stage.ts";

test("demo references reject external URLs, traversal and conflicting slide modes", async () => {
  const parse = (demo: string) =>
    parsePresentation({
      sections: [
        {
          heading: "Presentation",
          body:
            "```json\n" +
            JSON.stringify({
              version: 1,
              title: "Demo",
              start: "one",
              steps: [{ id: "one", type: "material", title: "One", demo }],
            }) +
            "\n```",
        },
      ],
    });
  for (const path of [
    "https://example.com/a.html",
    "./../a.html",
    "./a.js",
    "/a.html",
    "./x/../../a.html",
  ])
    assert.throws(() => parse(path));
  const definition = parse("./a.html");
  const library = {
    status: "ready",
    list: async () => [],
    read: async () => ({ sections: [] }),
    close: async () => {},
  };
  await assert.rejects(
    loadWebDemos(definition, "Lectures/Test/Presentations/Deck.md", library),
    /cannot read HTML/,
  );
});
test("demo state is bounded JSON and stays off the audience service", () => {
  assert.equal(validateDemoState('{"workers":4}'), '{"workers":4}');
  for (const state of [
    "null",
    "[]",
    "1",
    "invalid",
    JSON.stringify({ x: "a".repeat(16000) }),
  ])
    assert.throws(() => validateDemoState(state));
  const publicView = audienceStage({
    mode: "material",
    webDemo: {
      id: "private",
      url: "/slide-demo/private",
      state: '{"workers":4}',
    },
  });
  assert.equal(publicView.webDemo, undefined);
  assert.match(publicView.html!, /projector/);
});
