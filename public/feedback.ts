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
    '<summary>Responses</summary><section class="feedback-panel" aria-label="Private Q&A desk"><div class="button-row"><button id="feedback-focus" aria-pressed="false">Q&A desk</button><span id="feedback-keys" hidden>↑/↓ select · S shortlist · D discuss · A answered · F follow-up · R return · Esc exit</span></div><div class="button-row"><label>Collect <select id="feedback-mode"><option value="questions">Questions</option><option value="words">Word cloud</option></select></label></div><label>Prompt <input id="feedback-prompt" maxlength="200" value="What would you like to ask?"></label><div class="button-row"><button id="feedback-start">Open new collection</button><button id="feedback-close">Close collection</button></div><p>Approving words allows projection and inclusion in an explicitly launched AI build. Pending responses stay private.</p><p id="feedback-state"></p><div class="button-row"><button id="feedback-show">Show approved cloud</button><button id="feedback-return">Back to slide</button></div><button id="feedback-export">Export selected follow-ups (.md)</button><p id="feedback-error" role="status"></p><div id="feedback-items"></div></section>';
  query(".top-actions", document).prepend(menu);
  const $ = byId;
  let snapshot: FeedbackSnapshot = { config: null, items: [] };
  let selectedId = "";
  const excludedExports = new Set<string>();
  let busy = false,
    listKey = "",
    revision = 0;
  $("feedback-mode").onchange = () => {
    $("feedback-prompt").value =
      $("feedback-mode").value === "words"
        ? "Which words come to mind?"
        : "What would you like to ask?";
    revision++;
    listKey = "";
    void refresh(false);
  };
  const render = (value: FeedbackSnapshot) => {
    snapshot = value;
    const { config, items } = value;
    query("summary", menu).textContent =
      "Responses · " +
      items.filter((x) => x.status === "pending").length +
      " · Questions " +
      (value.questionCount ?? 0);
    $("feedback-state").textContent = config
      ? (config.open ? "Open" : "Closed") + " · " + config.prompt
      : "Collection closed";
    $("feedback-state").textContent +=
      " · Queue expires after 24 hours" +
      (value.expires
        ? " (" + new Date(value.expires).toLocaleString() + ")"
        : "");
    $("feedback-show").hidden = config?.mode !== "words";
    const next = JSON.stringify([config?.mode, items]);
    if (next === listKey) return;
    listKey = next;
    const button = (action: string, id: string, label: string) =>
      '<button data-action="' +
      action +
      '" data-id="' +
      escape(id) +
      '">' +
      label +
      "</button>";
    const groups: [string, string[]][] =
      config?.mode === "words"
        ? [["Words", ["pending", "approved"]]]
        : [
            ["Pending", ["pending"]],
            ["Shortlisted · up next", ["shortlist"]],
            ["Follow-ups", ["reply-later"]],
            ["Completed", ["answered", "dismissed", "done"]],
          ];
    const active = document.activeElement as HTMLElement | null;
    const focusId =
      active?.closest<HTMLElement>("[data-question-id]")?.dataset.questionId;
    const focusAction = active?.dataset.action;
    $("feedback-items").innerHTML = groups
      .map(([label, statuses]) => {
        const rows = items.filter((item) => statuses.includes(item.status));
        return (
          '<section class="feedback-group"><h3>' +
          label +
          " <small>" +
          rows.length +
          "</small></h3>" +
          (rows
            .map((x) => {
              const completed = ["answered", "dismissed", "done"].includes(
                x.status,
              );
              const status =
                (
                  {
                    answered: "Answered live",
                    "reply-later": "Reply later",
                    dismissed: "Dismissed",
                  } as Record<string, string>
                )[x.status] || x.status;
              return (
                '<article class="feedback-item" tabindex="0" data-question-id="' +
                escape(x.id) +
                '"><p>' +
                escape(x.text) +
                "</p>" +
                (x.email ? "<p>Reply email: " + escape(x.email) + "</p>" : "") +
                "<p>Status: " +
                escape(status) +
                "</p>" +
                (x.status === "reply-later"
                  ? '<label><input type="checkbox" data-export-id="' +
                    escape(x.id) +
                    '" ' +
                    (excludedExports.has(x.id) ? "" : "checked") +
                    "> Include in private export</label>"
                  : "") +
                '<div class="button-row">' +
                (config?.mode === "words"
                  ? (x.status === "approved"
                      ? "<button disabled>Approved</button>"
                      : button("approve", x.id, "Approve")) +
                    button("done", x.id, "Done")
                  : completed
                    ? button("pending", x.id, "Reopen")
                    : button("show-question", x.id, "Discuss") +
                      button(
                        x.status === "shortlist" ? "pending" : "shortlist",
                        x.id,
                        x.status === "shortlist"
                          ? "Remove from shortlist"
                          : "Shortlist",
                      ) +
                      button("answered", x.id, "Answered live") +
                      button("reply-later", x.id, "Reply later") +
                      button("dismissed", x.id, "Dismissed")) +
                "</div></article>"
              );
            })
            .join("") || "<p>No responses.</p>") +
          "</section>"
        );
      })
      .join("");
    for (const row of menu.querySelectorAll<HTMLElement>(
      "[data-question-id]",
    )) {
      row.classList.toggle("selected", row.dataset.questionId === selectedId);
      if (row.dataset.questionId === focusId) {
        const target = Array.from(
          row.querySelectorAll<HTMLButtonElement>("button"),
        ).find((item) => item.dataset.action === focusAction);
        (target || row).focus();
      }
    }
  };
  const act = async (action: ApiBody<"feedback">["action"], id?: string) => {
    if (busy) return;
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
    if (
      action === "shortlist" ||
      action === "pending" ||
      action === "approve" ||
      action === "done" ||
      action === "show-question" ||
      action === "answered" ||
      action === "reply-later" ||
      action === "dismissed"
    )
      void act(action, button?.dataset.id);
  };
  $("feedback-export").onclick = () => {
    if (snapshot.expires && snapshot.expires <= Date.now()) {
      $("feedback-error").textContent = "The response queue has expired";
      return;
    }
    const ids = new Set(
      Array.from(
        menu.querySelectorAll<HTMLInputElement>(
          "input[data-export-id]:checked",
        ),
        (input) => input.dataset.exportId,
      ),
    );
    const items = snapshot.items.filter(
      (item) => item.status === "reply-later" && ids.has(item.id),
    );
    if (!items.length) {
      $("feedback-error").textContent =
        "Select at least one follow-up to export";
      return;
    }
    // Quoted, escaped Markdown prevents attendee text from becoming Obsidian embeds.
    const literal = (text: string) =>
      text.replace(/[\\`*_{}[\]()<>#!|]/g, "\\$&").replace(/\r?\n/g, " ");
    const markdown =
      "# Private Q&A follow-ups\n\nExported " +
      new Date().toISOString() +
      "\n\n" +
      items
        .map(
          (item) =>
            "## Question\n\n> " +
            literal(item.text) +
            "\n\nEmail: " +
            literal(item.email || "Not provided") +
            "\n\nStatus: Reply later\n",
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "private-qa-follow-ups.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("feedback-items").onchange = (event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.exportId) {
      if (input.checked) excludedExports.delete(input.dataset.exportId);
      else excludedExports.add(input.dataset.exportId);
    }
  };
  menu.addEventListener("focusin", (event) => {
    const row = (event.target as Element).closest<HTMLElement>(
      "[data-question-id]",
    );
    if (row) {
      selectedId = row.dataset.questionId || "";
      for (const item of menu.querySelectorAll(".feedback-item"))
        item.classList.toggle("selected", item === row);
    }
  });
  $("feedback-focus").onclick = () => {
    const focused = menu.classList.toggle("qa-desk");
    $("feedback-focus").setAttribute("aria-pressed", String(focused));
    $("feedback-keys").hidden = !focused;
    if (focused) {
      $("feedback-mode").value = "questions";
      revision++;
      listKey = "";
      void refresh(false);
    }
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (!menu.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        menu.classList.remove("qa-desk");
        $("feedback-focus").setAttribute("aria-pressed", "false");
        $("feedback-keys").hidden = true;
        menu.open = false;
        query("summary", menu).focus();
        return;
      }
      if (
        !menu.classList.contains("qa-desk") ||
        $("feedback-mode").value !== "questions" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target as Element).closest(
          "input, textarea, select, [contenteditable]",
        )
      )
        return;
      const rows = Array.from(
        menu.querySelectorAll<HTMLElement>("[data-question-id]"),
      );
      const index = rows.findIndex(
        (row) => row.dataset.questionId === selectedId,
      );
      const actions: Record<string, ApiBody<"feedback">["action"]> = {
        s: "shortlist",
        d: "show-question",
        a: "answered",
        f: "reply-later",
        r: "return",
      };
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        rows[
          Math.max(
            0,
            Math.min(
              rows.length - 1,
              index + (event.key === "ArrowDown" ? 1 : -1),
            ),
          )
        ]?.focus();
      } else if (actions[event.key.toLowerCase()]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const action = actions[event.key.toLowerCase()]!;
        if (selectedId || action === "return")
          void act(action, selectedId || undefined);
      }
    },
    true,
  );
  document.addEventListener("click", (event) => {
    if (
      !menu.classList.contains("qa-desk") &&
      !menu.contains(event.target as Node)
    )
      menu.open = false;
  });
  async function refresh(schedule = true) {
    try {
      if (!busy) {
        const started = revision;
        const value = await call(
          $("feedback-mode").value === "questions"
            ? "feedback?mode=questions"
            : "feedback",
        );
        if (!busy && revision === started) {
          if ("config" in value) render(value);
        }
      }
    } catch (caught) {
      const e = asError(caught);
      if (menu.open) $("feedback-error").textContent = e.message;
    } finally {
      if (schedule) setTimeout(asyncHandler(refresh), 5000);
    }
  }
  void refresh();
}
