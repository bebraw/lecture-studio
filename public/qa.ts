import { parse, safeParse } from "valibot";
import { qaPublicSchema, qaPrivateSchema } from "../shared/qa.ts";
import { errorSchema } from "../shared/schemas.ts";
import type { FeedbackSnapshot } from "../shared/models.ts";
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const button = (id: string) => element<HTMLButtonElement>(id);
const base = location.pathname.replace(/\/moderate$/, "");
const moderator = document.body.dataset.moderator === "true";
let snapshot: FeedbackSnapshot | undefined,
  round = "",
  signedIn = false,
  busy = false,
  signature = "";
const status = (text: string) => {
  element("collection-status").textContent = text;
};
async function request(path: string, body?: object) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const value: unknown = await response.json();
  if (response.status === 401 && moderator && path !== "/login") {
    showLogin();
    return null;
  }
  if (!response.ok) {
    const error = safeParse(errorSchema, value);
    throw new Error(
      error.success ? error.output.error : "Request failed; try again",
    );
  }
  return value;
}
function showLogin() {
  signedIn = false;
  snapshot = undefined;
  signature = "";
  element("qa-login").hidden = false;
  element("moderation").hidden = true;
  element("qa-items").replaceChildren();
  element<HTMLInputElement>("moderator-key").value = "";
  status("Sign in to review questions");
}
async function run(action: () => Promise<void>) {
  if (busy) return;
  busy = true;
  element("qa-error").textContent = "";
  try {
    await action();
  } catch (error) {
    element("qa-error").textContent =
      error instanceof Error ? error.message : "Connection failed; try again";
  } finally {
    busy = false;
  }
}
const labels: Record<string, string> = {
  pending: "Pending",
  shortlist: "Shortlisted",
  answered: "Answered",
  "reply-later": "Follow-up",
  dismissed: "Dismissed",
};
function renderQueue() {
  if (!snapshot) return;
  const filter = element<HTMLSelectElement>("qa-filter").value;
  const next = JSON.stringify([snapshot.items, filter]);
  if (next === signature) return;
  signature = next;
  const host = element("qa-items");
  const focused =
    document.activeElement instanceof HTMLElement &&
    host.contains(document.activeElement)
      ? document.activeElement
      : null;
  const focusedId = focused?.closest<HTMLElement>(".question")?.dataset.id;
  const focusedAction = focused?.dataset.action;
  const opened = new Set(
    [...host.querySelectorAll<HTMLDetailsElement>("details[open]")].map(
      (details) => details.closest<HTMLElement>(".question")?.dataset.id,
    ),
  );
  const items = snapshot.items.filter(
    (item) => filter === "all" || item.status === filter,
  );
  host.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "No questions in this group.";
    host.append(empty);
  }
  for (const item of items) {
    const article = document.createElement("article");
    article.className = "question";
    article.dataset.status = item.status;
    article.dataset.id = item.id;
    const state = document.createElement("p");
    state.className = "state";
    state.textContent = labels[item.status] || item.status;
    const title = document.createElement("h2");
    title.textContent = item.text;
    article.append(state, title);
    if (item.email) {
      const details = document.createElement("details"),
        summary = document.createElement("summary"),
        email = document.createElement("p");
      summary.textContent = "Private reply address";
      email.textContent = item.email;
      details.open = opened.has(item.id);
      details.append(summary, email);
      article.append(details);
    }
    const actions = document.createElement("div");
    actions.className = "controls";
    for (const [action, label] of [
      ["shortlist", "Shortlist"],
      ["answered", "Answered"],
      ["reply-later", "Follow-up"],
      ["dismissed", "Dismiss"],
      ["pending", "Return to pending"],
    ]) {
      if (action === item.status) continue;
      const control = document.createElement("button");
      control.textContent = label!;
      control.dataset.action = action;
      control.onclick = () =>
        void run(async () => {
          applyPrivate(await request("/manage", { action, id: item.id }));
        });
      actions.append(control);
    }
    article.append(actions);
    host.append(article);
  }
  if (focusedId) {
    const article = [...host.querySelectorAll<HTMLElement>(".question")].find(
      (item) => item.dataset.id === focusedId,
    );
    const target =
      article &&
      [...article.querySelectorAll<HTMLButtonElement>("button")].find(
        (item) => item.dataset.action === focusedAction,
      );
    (
      target ||
      article?.querySelector<HTMLElement>("summary,button") ||
      element("qa-filter")
    ).focus({ preventScroll: true });
  }
}
function applyPrivate(value: unknown) {
  if (value === null) return;
  const data = parse(qaPrivateSchema, value);
  snapshot = data.feedback;
  signedIn = true;
  element("qa-login").hidden = true;
  element("moderation").hidden = false;
  status(
    `${snapshot.config?.open ? "Questions open" : "Questions closed"} · ${snapshot.questionCount || 0} awaiting discussion`,
  );
  button("qa-open").disabled = !!snapshot.config?.open;
  button("qa-close").disabled = !snapshot.config?.open;
  element("qa-expiry").textContent = snapshot.expires
    ? "Questions and reply addresses are deleted " +
      new Date(snapshot.expires).toLocaleString() +
      ". Download follow-ups before then."
    : "Opening questions starts a 24-hour collection. Closing and reopening preserves it until expiry.";
  renderQueue();
}
async function refresh() {
  if (moderator) {
    if (signedIn) applyPrivate(await request("/manage"));
  } else {
    const data = parse(qaPublicSchema, await request("/state"));
    round = data.config?.round || "";
    const open = !!data.config?.open;
    status(open ? "Questions are open" : "Questions are closed");
    button("question-send").disabled = !open;
  }
}
if (moderator) {
  element<HTMLAnchorElement>("audience-link").href = base;
  element<HTMLFormElement>("qa-login").onsubmit = (event) => {
    event.preventDefault();
    void run(async () => {
      const input = element<HTMLInputElement>("moderator-key"),
        key = input.value;
      input.value = "";
      await request("/login", { key });
      applyPrivate(await request("/manage"));
    });
  };
  for (const action of ["open", "close"])
    button("qa-" + action).onclick = () =>
      void run(async () => {
        applyPrivate(await request("/manage", { action }));
      });
  button("qa-logout").onclick = () =>
    void run(async () => {
      await request("/logout", {});
      showLogin();
    });
  element<HTMLSelectElement>("qa-filter").onchange = renderQueue;
  button("qa-export").onclick = () => {
    const items =
      snapshot?.items.filter((item) => item.status === "reply-later") || [];
    if (!items.length) {
      element("qa-error").textContent =
        "Mark at least one question for follow-up first.";
      return;
    }
    const quote = (text: string) =>
      text.replace(/[\\`*_{}[\]<>#+.!|~-]/g, "\\$&").replace(/\r?\n/g, "\n> ");
    const text =
      "# Private Q&A follow-ups\n\n" +
      items
        .map(
          (item, index) =>
            `## ${index + 1}\n\n> ${quote(item.text)}\n\nReply email: ${quote(item.email || "Not supplied")}\n\n`,
        )
        .join("");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "private-qa-follow-ups.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  void run(async () => {
    applyPrivate(await request("/manage"));
  });
} else {
  element<HTMLFormElement>("qa-submit").onsubmit = (event) => {
    event.preventDefault();
    void run(async () => {
      await request("/questions", {
        round,
        text: element<HTMLTextAreaElement>("question-text").value,
        email: element<HTMLInputElement>("question-email").value,
      });
      element<HTMLTextAreaElement>("question-text").value = "";
      element<HTMLInputElement>("question-email").value = "";
      element("submission-status").textContent =
        "Your question was sent privately to the moderators.";
    });
  };
  void run(refresh);
}
async function poll() {
  if (!document.hidden && !busy) await run(refresh);
  setTimeout(() => void poll(), 3000);
}
setTimeout(() => void poll(), 3000);
