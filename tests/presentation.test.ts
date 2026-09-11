import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePresentation,
  PresentationSession,
  parseTheme,
} from "../lib/presentation.ts";
const definition = {
  version: 1,
  title: "Test",
  start: "question",
  steps: [
    {
      id: "question",
      type: "question",
      title: "Question",
      next: "poll",
      related: ["aside"],
    },
    { id: "aside", type: "material", title: "Aside" },
    {
      id: "poll",
      type: "poll",
      title: "Theme",
      room: "test",
      poll: {
        question: "Theme?",
        options: [
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
        ],
        defaultId: "one",
      },
      next: "build",
    },
    {
      id: "build",
      type: "build",
      title: "Build",
      body: "Implement.",
      uses: [
        { poll: "poll", instructions: { one: "Use one.", two: "Use two." } },
      ],
    },
  ],
};
const note = (value: unknown) => ({
  sections: [
    {
      heading: "Presentation",
      body: "```json\n" + JSON.stringify(value) + "\n```",
    },
  ],
});
test("slide numbering includes detours while progress follows the lecture path", () => {
  const d = {
    version: 1,
    title: "Deck",
    start: "a",
    steps: [
      { id: "a", type: "material", title: "A", next: "b", related: ["aside"] },
      { id: "b", type: "material", title: "B", next: "refs" },
      {
        id: "refs",
        type: "material",
        title: "References",
        chapter: "References",
      },
      { id: "aside", type: "material", title: "Aside" },
    ],
  };
  const session = new PresentationSession(parsePresentation(note(d)), "test");
  assert.deepEqual(session.position(), { number: 1, total: 4, progress: 0.5 });
  session.move("detour", "aside");
  assert.equal(session.position().progress, 0.5);
  session.move("return");
  session.move("next");
  assert.equal(session.position().progress, 1);
  session.move("next");
  assert.equal(session.position().number, 3);
  session.move("select", "aside");
  assert.equal(session.position().progress, null);
});
test("remote slide images require an explicit boolean opt-in", () => {
  const d = {
    version: 1,
    title: "Images",
    start: "image",
    steps: [
      {
        id: "image",
        type: "material",
        title: "Browser",
        body: "![Browser](https://www.w3.org/browser.gif)",
        allowRemoteImages: false as unknown,
      },
    ],
  };
  const preview = () =>
    new PresentationSession(parsePresentation(note(d)), "test").state().preview
      .html;
  assert.doesNotMatch(preview(), /<img /);
  d.steps[0].allowRemoteImages = true;
  assert.match(preview(), /<img referrerpolicy="no-referrer"/);
  d.steps[0].allowRemoteImages = "true";
  assert.throws(preview, /Invalid remote image/);
});
test("presentation themes default to white and validate overrides", () => {
  assert.equal(parseTheme().background, "#ffffff");
  assert.equal(
    parseTheme({ headingFont: "Verdana, sans-serif" }).headingFont,
    "Verdana, sans-serif",
  );
  assert.throws(
    () => parseTheme({ background: "url(example)" }),
    /Invalid theme/,
  );
  assert.throws(
    () => parseTheme({ bodyFont: "bad; color:red" }),
    /Invalid theme/,
  );
  assert.equal(
    new PresentationSession(parsePresentation(note(definition)), "test").state()
      .theme.text,
    "#202020",
  );
});
test("presentation snapshot, detour return and explicit defaults", () => {
  const p = new PresentationSession(
    parsePresentation(note(definition)),
    "test",
  );
  definition.steps[0].title = "Changed";
  assert.equal(p.step().title, "Question");
  p.move("detour", "aside");
  p.move("return");
  assert.equal(p.current, "question");
  p.move("next");
  p.move("next");
  assert.deepEqual(p.resolve().missing, ["poll"]);
  p.defaults.add("build");
  assert.match(p.resolve().prompt, /Use one/);
  p.decisions.poll = {
    winner: { id: "two", label: "Two" },
    revision: 7,
    question: "Theme?",
    reason: "votes",
    capturedAt: new Date().toISOString(),
    status: "locked",
    totalVotes: 1,
    choices: [{ id: "two", label: "Two", votes: 1 }],
  };
  assert.match(p.resolve().prompt, /Use two/);
  assert.equal(p.resolve().inputs[0].revision, 7);
});
test("invalid graph links are rejected", () => {
  assert.throws(
    () => parsePresentation(note({ ...definition, start: "missing" })),
    /Missing start/,
  );
});

test("presentation validation rejects missing IDs and malformed graph fields", () => {
  const step = { id: "one", type: "material", title: "One" };
  const deck = { version: 1, title: "Deck", start: "one", steps: [step] };
  assert.equal(parsePresentation(note(deck)).start, "one");
  const invalid: unknown[] = [
    null,
    {},
    { ...deck, version: 2 },
    { ...deck, title: 1 },
    { ...deck, steps: [] },
    {
      ...deck,
      steps: Array.from({ length: 101 }, (_, i) => ({ ...step, id: "s" + i })),
    },
    { ...deck, steps: [step, step] },
    {
      version: 1,
      title: "Missing IDs",
      steps: [{ type: "material", title: "One" }],
    },
  ];
  for (const change of [
    { id: 1 },
    { id: "BAD" },
    { type: "unknown" },
    { body: 0 },
    { notes: false },
    { source: 1 },
    { chapter: 1 },
    { next: "missing" },
    { related: "one" },
    { related: ["missing"] },
    { uses: {} },
    { allowRemoteImages: "true" },
  ])
    invalid.push({ ...deck, steps: [{ ...step, ...change }] });
  for (const input of invalid)
    assert.throws(() => parsePresentation(note(input)), JSON.stringify(input));
  for (const theme of [
    null,
    [],
    "white",
    { unknown: "#ffffff" },
    { text: "#fff" },
    { text: 7 },
  ])
    assert.throws(() => parseTheme(theme));
});

test("navigation rejects unknown steps and only returns through linked detours", () => {
  const session = new PresentationSession(
    parsePresentation(note(definition)),
    "test",
  );
  assert.throws(() => session.move("select", "missing"), /Unknown step/);
  assert.throws(() => session.move("detour", "build"), /linked detour/);
  session.move("return");
  assert.equal(session.current, "question");
  session.move("detour", "aside");
  assert.equal(session.current, "aside");
  assert.equal(session.state().canReturn, true);
  session.move("return");
  assert.equal(session.current, "question");
  assert.equal(session.state().canReturn, false);
  session.move("next");
  assert.equal(session.current, "poll");
  session.move("previous");
  assert.equal(session.current, "question");
  session.move("select", "build");
  assert.deepEqual(session.history, []);
  assert.deepEqual(session.resolve().missing, ["poll"]);
  session.defaults.add("build");
  assert.deepEqual(session.resolve().inputs, [
    { poll: "poll", selected: "one", default: true, revision: null },
  ]);
  session.current = "missing";
  assert.throws(() => session.step(), /Unknown current/);
});
