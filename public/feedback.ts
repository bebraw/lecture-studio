import { asyncHandler } from "../shared/errors.ts";
import type { ApiBody } from "../shared/api.ts";
import type { MountOptions } from "../shared/api.ts";
import type { FeedbackSnapshot } from "../shared/models.ts";
import { query, byId } from "./dom.ts";
import { asError } from "../shared/errors.ts";
import { escape } from "./shared.ts";
export function mountFeedback({ call, update }: MountOptions) {
  const menu = document.createElement("details");
  menu.id = "feedback-menu";
  menu.innerHTML =
    '<summary>Responses</summary><section class="feedback-panel"><div class="button-row"><label>Collect <select id="feedback-mode"><option value="questions">Questions</option><option value="words">Word cloud</option></select></label></div><label>Prompt <input id="feedback-prompt" maxlength="200" value="What would you like to ask?"></label><div class="button-row"><button id="feedback-start">Open new collection</button><button id="feedback-close">Close collection</button></div><p>Approving words allows projection and inclusion in an explicitly launched AI build. Pending responses stay private.</p><p id="feedback-state"></p><div class="button-row"><button id="feedback-show">Show approved cloud</button><button id="feedback-return">Back to slide</button></div><p id="feedback-error" role="status"></p><div id="feedback-items"></div></section>';
  query(".top-actions", document).prepend(menu);
  const $ = byId;
  let snapshot: FeedbackSnapshot | null = null,
    busy = false,
    listKey = "",
    revision = 0;
  $("feedback-mode").onchange = () => {
    $("feedback-prompt").value =
      $("feedback-mode").value === "words"
        ? "Which words come to mind?"
        : "What would you like to ask?";
  };
  const render = (value: FeedbackSnapshot) => {
    snapshot = value;
    const { config, items } = value;
    query("summary", menu).textContent =
      "Responses · " + items.filter((x) => x.status === "pending").length;
    $("feedback-state").textContent = config
      ? (config.open ? "Open" : "Closed") + " · " + config.prompt
      : "Collection closed";
    $("feedback-show").hidden = config?.mode !== "words";
    const next = JSON.stringify(items);
    if (next === listKey) return;
    listKey = next;
    $("feedback-items").innerHTML =
      items
        .filter((x) => x.status !== "done")
        .map(
          (x) =>
            '<div class="feedback-item"><p>' +
            escape(x.text) +
            '</p><div class="button-row">' +
            (config?.mode === "words"
              ? '<button data-action="approve" data-id="' +
                escape(x.id) +
                '" ' +
                (x.status === "approved" ? "disabled" : "") +
                "> " +
                (x.status === "approved" ? "Approved" : "Approve") +
                "</button>"
              : '<button data-action="show-question" data-id="' +
                escape(x.id) +
                '">Discuss</button>') +
            '<button data-action="done" data-id="' +
            escape(x.id) +
            '">Done</button></div></div>',
        )
        .join("") || "<p>No responses.</p>";
  };
  const act = async (action: ApiBody<"feedback">["action"], id?: string) => {
    if (busy) return;
    if (
      action === "start" &&
      snapshot?.items?.length &&
      !confirm("Start a new collection? Current responses will be removed.")
    )
      return;
    busy = true;
    revision++;
    try {
      const result = await call("feedback", {
        action,
        ...(id === undefined ? {} : { id }),
        mode: $("feedback-mode").value,
        prompt: $("feedback-prompt").value,
      });
      if ("projection" in result) update(result);
      else render(result);
      $("feedback-error").textContent = "";
    } catch (caught) {
      const e = asError(caught);
      $("feedback-error").textContent = e.message;
    } finally {
      busy = false;
    }
  };
  for (const [id, action] of [
    ["start", "start"],
    ["close", "close"],
    ["show", "show-cloud"],
    ["return", "return"],
  ] as const)
    $("feedback-" + id).onclick = () => void act(action);
  $("feedback-items").onclick = (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    const action = button?.dataset.action;
    if (action === "approve" || action === "done" || action === "show-question")
      void act(action, button?.dataset.id);
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) {
      menu.open = false;
      query("summary", menu).focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node)) menu.open = false;
  });
  async function refresh() {
    try {
      if (!busy) {
        const started = revision;
        const value = await call("feedback");
        if (!busy && revision === started) {
          if ("config" in value) render(value);
        }
      }
    } catch (caught) {
      const e = asError(caught);
      if (menu.open) $("feedback-error").textContent = e.message;
    } finally {
      setTimeout(asyncHandler(refresh), 5000);
    }
  }
  void refresh();
}
