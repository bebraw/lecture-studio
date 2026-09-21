import test from "node:test";
import assert from "node:assert/strict";
import { feedbackSlide } from "../lib/feedback.ts";
test("word clouds contain only approved escaped text and frozen counts", () => {
  const snapshot = {
    config: { mode: "words", prompt: "Your words", round: "test", open: true },
    items: [
      { id: "Web", text: "Web", status: "approved" },
      { id: "web", text: "web", status: "approved" },
      { id: "PRIVATE", text: "PRIVATE", status: "pending" },
      { id: "REMOVED", text: "REMOVED", status: "done" },
      { id: "<script>", text: "<script>", status: "approved" },
    ],
  };
  const slide = feedbackSlide(snapshot);
  assert.match(slide.html, /web<small> ×2/);
  assert.match(slide.html, /&lt;script&gt;/);
  assert.doesNotMatch(slide.html, /PRIVATE|REMOVED|<script>/);
  snapshot.items.push({ id: "later", text: "later", status: "approved" });
  assert.doesNotMatch(slide.html, /later/);
});
test("question projection requires a selected non-dismissed question", () => {
  const snapshot = {
    config: {
      mode: "questions",
      prompt: "Question",
      round: "test",
      open: true,
    },
    items: [
      {
        id: "one",
        text: "Why?",
        status: "pending",
        email: "private@example.org",
      },
      { id: "two", text: "Hidden", status: "done" },
    ],
  };
  assert.equal(feedbackSlide(snapshot, "one").title, "Why?");
  assert.doesNotMatch(
    JSON.stringify(feedbackSlide(snapshot, "one")),
    /private@example/,
  );
  assert.throws(() => feedbackSlide(snapshot, "two"));
  assert.throws(() => feedbackSlide(snapshot));
});
