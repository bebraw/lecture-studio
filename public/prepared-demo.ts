import { query } from "./dom.ts";
import { asyncHandler } from "../shared/errors.ts";
const form = query("#prepared-form", document);
const status = query("#prepared-status", document);
const results = query("#prepared-aggregate", document);
let submitting = false;
async function render(response: Response) {
  const html = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const aggregate = html.querySelector("#prepared-aggregate");
  if (!aggregate) throw new Error("Results unavailable");
  results.replaceChildren(...aggregate.childNodes);
}
form.onsubmit = asyncHandler(async (event: SubmitEvent) => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  status.textContent = "Sending…";
  try {
    const body = new URLSearchParams();
    new FormData(form).forEach((value, key) =>
      body.append(key, typeof value === "string" ? value : ""),
    );
    const response = await fetch(form.action, { method: "POST", body });
    if (!response.ok)
      throw new Error(
        "Submission was not accepted. Check required fields; your input is preserved.",
      );
    await render(response);
    status.textContent = "Confirmed by the server.";
  } catch {
    status.textContent =
      "No confirmation. Check required fields and authoritative results before retrying; input is preserved.";
  } finally {
    submitting = false;
  }
});
setInterval(
  asyncHandler(async () => {
    if (submitting) return;
    try {
      await render(
        await fetch(location.pathname.replace(/\/results$/, "") + "/results", {
          cache: "no-store",
          signal: AbortSignal.timeout(1500),
        }),
      );
    } catch {
      status.textContent =
        "Shared results may be stale. Your unsent input is preserved.";
    }
  }),
  2000,
);
