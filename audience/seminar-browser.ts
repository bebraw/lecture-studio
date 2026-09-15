import { asyncHandler } from "../shared/errors";

const region = document.querySelector<HTMLElement>("#room-results");
const form = document.querySelector<HTMLFormElement>("[data-progressive-form]");
const status = document.querySelector<HTMLElement>("#room-update-status");
const draftKey = `room-choice:${location.pathname}`;
let busy = false;
let submitting = false;

function report(message: string) {
  if (status) status.textContent = message;
}

function remember() {
  const selected = form?.querySelector<HTMLInputElement>("input:checked");
  try {
    if (selected) sessionStorage.setItem(draftKey, selected.value);
  } catch {
    /* Native submission still remembers saved votes through the server. */
  }
}

try {
  const saved = sessionStorage.getItem(draftKey);
  for (const input of form?.querySelectorAll<HTMLInputElement>(
    "input[type=radio]",
  ) ?? []) {
    if (input.value === saved) input.checked = true;
  }
} catch {
  /* Storage may be unavailable. */
}
form?.addEventListener("change", remember);

async function refresh() {
  const response = await fetch(location.href, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Results unavailable");
  const next = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const incoming = next.querySelector<HTMLElement>("#room-results");
  const aggregate = next.querySelector("#room-aggregate");
  const current = document.querySelector("#room-aggregate");
  if (!incoming || !aggregate || !current || !region)
    throw new Error("Invalid results");
  if (
    Number(incoming.dataset.roomRevision) < Number(region.dataset.roomRevision)
  )
    return;
  if (incoming.dataset.roomRevision !== region.dataset.roomRevision) {
    current.replaceChildren(...aggregate.childNodes);
    region.dataset.roomRevision = incoming.dataset.roomRevision ?? "";
  }
  region.dataset.roomStatus = incoming.dataset.roomStatus ?? "";
  const locked = incoming.dataset.roomStatus === "locked";
  const fieldset = form?.querySelector("fieldset");
  if (fieldset) fieldset.disabled = locked;
  const button = form?.querySelector<HTMLButtonElement>("button[type=submit]");
  if (button) button.disabled = locked || submitting;
  if (status?.textContent?.startsWith("Results connection interrupted"))
    report("Results are up to date.");
}

form?.addEventListener(
  "submit",
  asyncHandler(async (event: SubmitEvent) => {
    event.preventDefault();
    if (submitting) return;
    remember();
    submitting = true;
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (button) button.disabled = true;
    report("Saving your choice…");
    try {
      const data = new FormData(form);
      const choice = data.get("choice");
      if (typeof choice !== "string") throw new Error("Choose one option.");
      const response = await fetch(form.action, {
        method: "POST",
        body: new URLSearchParams({ choice }),
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok && response.type !== "opaqueredirect")
        throw new Error("Your choice could not be saved.");
      // GET separately: native POST keeps its existing redirect destination.
      await refresh();
      report("Choice saved. You can change it without adding another vote.");
    } catch {
      report(
        "Could not confirm your vote. Your choice is kept; retry to save it.",
      );
    } finally {
      submitting = false;
      if (button) button.disabled = region?.dataset.roomStatus === "locked";
    }
  }),
);

// Each browser requests the server independently; no cross-browser local storage.
setInterval(
  asyncHandler(async () => {
    if (busy || submitting || document.hidden) return;
    busy = true;
    try {
      await refresh();
    } catch {
      report(
        "Results connection interrupted. Retrying automatically; you can also refresh the page.",
      );
    } finally {
      busy = false;
    }
  }),
  2000,
);
