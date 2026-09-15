import { audienceRooms } from "../shared/audience-rooms.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sections } from "../lib/material.ts";
import {
  parsePresentation,
  PresentationSession,
  parseTheme,
} from "../lib/presentation.ts";
test("versioned lecture loads with formatter-safe fences and a complete main path", async () => {
  const markdown = await readFile(
    new URL("../docs/presentations/web-development-2026.md", import.meta.url),
    "utf8",
  );
  const lecture = parsePresentation(sections(markdown));
  for (const step of lecture.steps.filter((s) => s.type === "poll")) {
    assert.deepEqual(
      audienceRooms[step.room!]?.choices,
      step.poll!.options,
      "Prepared room matches " + step.id,
    );
  }
  const visited = new Set<string>();
  let id: string | undefined = lecture.start;
  while (id) {
    assert.ok(!visited.has(id), "The main path must not loop");
    visited.add(id);
    id = lecture.steps.find((step) => step.id === id)!.next;
  }
  for (const chapter of ["Past", "Present", "Future", "References"]) {
    const divider = lecture.steps.find(
      (step) => step.type === "title" && step.title === chapter,
    );
    assert.ok(
      divider && visited.has(divider.id),
      chapter + " divider is on the main path",
    );
  }
  assert.ok(visited.has("contents"));
  assert.ok(visited.has("references-history-photos"));
});
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
test("slide numbering and progress follow the flat slide order", () => {
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
  assert.deepEqual(session.state().outline, d.steps);
  assert.deepEqual(session.position(), { number: 1, total: 4, progress: 0.25 });
  session.move("detour", "aside");
  assert.equal(session.position().progress, 1);
  session.move("return");
  session.move("next");
  assert.equal(session.position().progress, 0.5);
  session.move("next");
  assert.equal(session.position().number, 3);
  session.move("select", "aside");
  assert.equal(session.position().progress, 1);
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
  assert.ok(d.steps[0]);
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
  assert.ok(definition.steps[0]);
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
  assert.equal(p.resolve().inputs[0]?.revision, 7);
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

test("first build maps approved audience needs and labels missing findings", async () => {
  const markdown = await readFile(
    new URL("../docs/presentations/web-development-2026.md", import.meta.url),
    "utf8",
  );
  const session = new PresentationSession(
    parsePresentation(sections(markdown)),
    "test",
  );
  session.move("select", "build-document");
  assert.match(session.resolve().prompt, /No approved word-cloud responses/);
  session.approvedWords["knowledge-experience"] = ["date", "prerequisites"];
  const prompt = session.resolve().prompt;
  assert.match(prompt, /"text":"date","count":1/);
  assert.match(prompt, /"text":"prerequisites","count":1/);
  assert.match(prompt, /headings, content order/);
  assert.doesNotMatch(prompt, /No approved word-cloud responses/);
});

test("later builds and reviews use their own approved audience input", async () => {
  const markdown = await readFile(
    new URL("../docs/presentations/web-development-2026.md", import.meta.url),
    "utf8",
  );
  const session = new PresentationSession(
    parsePresentation(sections(markdown)),
    "test",
  );
  session.approvedWords["knowledge-experience"] = ["date"];
  session.approvedWords["step-9"] = ["clear feedback"];
  session.approvedWords["future-visions"] = ["compare topics"];
  session.approvedWords["closing-app-question"] = ["test offline"];
  session.move("select", "build-application");
  assert.doesNotMatch(session.resolve().prompt, /clear feedback/);
  assert.doesNotMatch(session.resolve().prompt, /compare topics/);
  session.move("select", "build-agents");
  assert.match(session.resolve().prompt, /compare topics/);
  assert.match(session.resolve().prompt, /unsupported tasks/);
  session.move("select", "check-document-review");
  assert.match(session.resolve().prompt, /date/);
  session.move("select", "audience-evidence-recap");
  for (const term of ["date", "compare topics", "test offline"])
    assert.ok(session.resolve().prompt.includes(term));
});

test("full-size approved collections remain readable and references must resolve", async () => {
  const lecture = parsePresentation(
    sections(
      await readFile(
        new URL(
          "../docs/presentations/web-development-2026.md",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const session = new PresentationSession(lecture, "test");
  for (const step of lecture.steps.filter((s) => s.wordCloud))
    session.approvedWords[step.id] = Array.from({ length: 500 }, (_, i) =>
      i < 250 ? "date" : "finding " + i,
    );
  session.move("select", "audience-evidence-recap");
  const summary = session.resolve().prompt;
  assert.ok(summary.length < 4000);
  assert.match(summary, /date \(250\)/);
  assert.ok(summary.split("\n- ").length <= 13);
  session.move("select", "build-document");
  session.defaults.add("build-document");
  assert.ok(session.resolve().prompt.length < 16000);
  assert.equal(session.approvedWords["knowledge-experience"]!.length, 500);
  const broken = structuredClone(lecture);
  broken.steps[0]!.wordsFrom = "missing";
  assert.throws(() => parsePresentation(note(broken)), /Word references/);
});
