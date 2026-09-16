import * as v from "valibot";
import { errorSchema } from "../shared/schemas.ts";
import {
  audienceResponseSchema,
  publicFeedbackSchema,
} from "../shared/audience-schemas.ts";
import { asyncHandler } from "../shared/errors.ts";
import type { FeedbackConfig } from "../shared/models.ts";
import { query } from "../public/dom.ts";
import { asError } from "../shared/errors.ts";
import {
  surface,
  applyTheme,
  renderDiagrams,
  createStageStatus,
  escape,
} from "../public/shared.ts";
const main = query("#stage-content", document),
  notice = query("#stage-connection", document);
const updateStatus = createStageStatus();
// One short-lived anonymous browser identity; embedded desk previews do not join.
async function heartbeat() {
  if (window.top === window.self && document.visibilityState === "visible") {
    try {
      await fetch("/api/presence", {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }
}
void heartbeat();
setInterval(() => void heartbeat(), 15000);
document.addEventListener("visibilitychange", () => void heartbeat());
let key = "",
  submitting = false,
  voteError = "";
const feedback = document.createElement("details");
feedback.id = "student-feedback";
feedback.hidden = true;
feedback.innerHTML =
  '<summary>Send a response</summary><form><label id="feedback-label" for="feedback-text"></label><textarea id="feedback-text" required maxlength="400" aria-describedby="feedback-hint"></textarea><p id="feedback-hint"></p><p>The lecturer reviews responses before sharing. Approved words may appear on slides and be sent to the AI builder when the lecturer starts a build. Do not include names or sensitive information. The response queue expires after 24 hours; projected slides, model conversations and generated apps may retain approved words longer.</p><button>Send for review</button><p id="feedback-notice" role="status"></p></form>';
query(".stage-bottom", document).before(feedback);
let feedbackConfig: FeedbackConfig | null = null,
  feedbackBusy = false;
async function refreshFeedback() {
  try {
    const response = await fetch("/api/feedback", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error();
    const config = v.parse(publicFeedbackSchema, await response.json());
    if (config?.round !== feedbackConfig?.round) {
      feedback.open = config?.mode === "words" && config.open;
      query("form", feedback).reset();
      query("#feedback-notice", feedback).textContent = "";
    }
    feedbackConfig = config;
    feedback.hidden = !config?.open;
    if (config?.open) {
      query("summary", feedback).textContent =
        config.mode === "words" ? "Add words" : "Ask a question";
      query("#feedback-label", feedback).textContent = config.prompt;
      query("#feedback-hint", feedback).textContent =
        config.mode === "words"
          ? "One idea per line. Use 1–3 words and at most 32 characters per idea. Send up to five ideas together; commas do not separate ideas."
          : "Ask one question, up to 400 characters.";
      query("textarea", feedback).placeholder = "";

      query("textarea", feedback).maxLength =
        config.mode === "words" ? 164 : 400;
    }
  } catch {
    feedback.hidden = true;
  } finally {
    setTimeout(asyncHandler(refreshFeedback), 3000);
  }
}
query("form", feedback).onsubmit = async (event) => {
  event.preventDefault();
  if (feedbackBusy || !feedbackConfig?.open) return;
  feedbackBusy = true;
  const button = query("button", feedback);
  button.disabled = true;
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        round: feedbackConfig.round,
        text: query("textarea", feedback).value,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const result = v.safeParse(errorSchema, await response.json());
      throw new Error(result.success ? result.output.error : "Not confirmed");
    }
    query("textarea", feedback).value = "";
    query("#feedback-notice", feedback).textContent =
      "Sent privately. The lecturer chooses what to show.";
  } catch (caught) {
    const e = asError(caught);
    query("#feedback-notice", feedback).textContent = e.message;
  } finally {
    feedbackBusy = false;
    button.disabled = false;
  }
};
void refreshFeedback();
async function refresh() {
  try {
    const response = await fetch("/api/audience", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error();
    const { stage, poll, active } = v.parse(
      audienceResponseSchema,
      await response.json(),
    );
    query("#audience-followers", document).textContent =
      active === undefined ? "Following: unavailable" : `${active} following`;
    const next = poll
      ? "poll:" + poll.id
      : JSON.stringify(stage && { ...stage, build: undefined });
    if (!submitting && next !== key) {
      key = next;
      applyTheme(document.body, stage?.theme);
      document.body.classList.toggle("blank", !poll && !!stage?.blank);
      main.dataset.mode = poll ? "poll" : stage?.mode || "material";
      main.innerHTML = poll
        ? "<h1>" + escape(poll.question) + "</h1>" + poll.html
        : stage
          ? surface(stage)
          : "<h1>Waiting for the lecturer</h1>";
      query("#era", document).textContent = poll
        ? "VOTE"
        : stage?.act?.replaceAll("-", " ").toUpperCase() || "";
      query("#source-credit", document).textContent = poll
        ? "Voting stays open until the lecturer closes it."
        : stage?.source || "";
      void renderDiagrams(main);
    }
    updateStatus(poll ? null : stage);
    notice.textContent = voteError;
  } catch {
    query("#audience-followers", document).textContent =
      "Following: unavailable";
    notice.textContent = "Connection lost · holding the last view";
  }
}
main.addEventListener(
  "submit",
  asyncHandler(async (event) => {
    event.preventDefault();
    if (submitting) return;
    const form = event.target as HTMLFormElement,
      button = query("button", form);
    submitting = true;
    button.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new URLSearchParams(
          [...new FormData(form)].map(([key, value]) => [
            key,
            typeof value === "string" ? value : value.name,
          ]),
        ),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      voteError = "";
      button.textContent = "Vote saved · change vote";
    } catch {
      voteError = "Vote not confirmed. Try again.";
      notice.textContent = voteError;
    } finally {
      submitting = false;
      button.disabled = false;
    }
  }),
);
async function tick() {
  await refresh();
  setTimeout(asyncHandler(tick), 1500);
}
void tick();
