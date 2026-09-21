import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parsePresentation,
  PresentationSession,
  authoringMarkdown,
} from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { selectVariant, variantTiming } from "../lib/variants.ts";
import { timingLabel } from "../shared/variants.ts";
const source = await readFile("examples/conference/talk.md", "utf8");
test("event variants reorder shared slides, rebuild navigation and keep separate budgets", () => {
  const deck = parsePresentation(sections(source));
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
  const selected = selectVariant(deck, "ai-day");
  assert.deepEqual(
    selected.steps.map((step) => step.id),
    ["opening", "comparison", "order", "references"],
  );
  assert.equal(selected.steps[2]!.next, "references");
  assert.equal(selected.steps[3]!.next, undefined);
  assert.equal(variantTiming(selected, "ai-day")?.plannedSeconds, 720);
  assert.equal(variantTiming(selected, "ai-day")?.qaSeconds, 180);
  assert.match(
    timingLabel(variantTiming(selected, "ai-day")!),
    /Speaking 12:00 \/ 12:00 · Q&A 3:00/,
  );
  assert.equal(deck.steps.length, 6);
  const session = new PresentationSession(deck, "example", "webist");
  assert.equal(session.state().variant, "webist");
  assert.equal(session.state().timing?.qaSeconds, 300);
  assert.equal(session.authoredDefinition.steps.length, 6);
  session.move("select", "order");
  session.navigate("next");
  assert.equal(session.current, "process");
  assert.throws(() => selectVariant(deck, "missing"), /Unknown/);
});
test("variant validation rejects missing, duplicate or omitted dependencies and reports incomplete timing", () => {
  const deck = parsePresentation(sections(source));
  const variant = deck.variants!["ai-day"]!;
  variant.slides = ["opening", "opening"];
  assert.throws(() => selectVariant(deck, "ai-day"), /duplicate/);
  variant.slides = ["missing"];
  assert.throws(() => selectVariant(deck, "ai-day"), /unknown slide/);
  variant.slides = ["opening", "order"];
  delete variant.durations;
  deck.steps.find((step) => step.id === "order")!.previewOf = "comparison";
  assert.throws(() => selectVariant(deck, "ai-day"), /requires earlier/);
  delete deck.steps.find((step) => step.id === "order")!.previewOf;
  deck.steps[0]!.related = ["comparison", "order"];
  let selected = selectVariant(deck, "ai-day");
  assert.deepEqual(selected.steps[0]!.related, ["order"]);
  assert.equal(variantTiming(selected, "ai-day")?.untimed.length, 2);
  variant.durations = { opening: 900, order: 0 };
  selected = selectVariant(deck, "ai-day");
  assert.equal(variantTiming(selected, "ai-day")?.overBudget, true);
  assert.equal(variantTiming(selected, "ai-day")?.qaSeconds, 180);
  variant.durations.comparison = 60;
  assert.throws(
    () => selectVariant(deck, "ai-day"),
    /duration refers to omitted/,
  );
  assert.throws(
    () =>
      parsePresentation(
        sections(source.replace("slides: [opening", "slides: [unknown")),
      ),
    /unknown slide/,
  );
});
