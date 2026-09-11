import { asyncHandler } from "../shared/errors.ts";
import { query } from "./dom.ts";
import {
  auth,
  api,
  surface,
  renderDiagrams,
  buildLabel,
  applyTheme,
} from "./shared.ts";
const token = auth("stage");
let version: string | number = -1;
const slideNumber = document.createElement("span");
slideNumber.id = "slide-number";
query(".stage-bottom", document).append(slideNumber);
const progress = document.createElement("progress");
progress.id = "slide-progress";
progress.max = 1;
progress.setAttribute("aria-label", "Lecture progress");
document.body.append(progress);
async function poll() {
  try {
    const state = await api(token, "stage");
    document.body.classList.toggle("blank", state.blank);
    slideNumber.textContent = state.slidePosition
      ? "Slide " +
        state.slidePosition.number +
        " / " +
        state.slidePosition.total
      : "";
    progress.hidden = state.slidePosition?.progress == null;
    progress.value = state.slidePosition?.progress ?? 0;
    if (state.version !== version) {
      version = state.version;
      applyTheme(document.body, state.theme);
      query("#stage-content", document).innerHTML = surface(state);
      query("#stage-content", document).dataset.mode = state.mode;
      query("#era", document).textContent = state.act
        .replaceAll("-", " ")
        .toUpperCase();
      query("#source-credit", document).textContent = state.source;
      void renderDiagrams(query("#stage-content", document));
    }
    query("#build-signal", document).textContent = buildLabel(
      state.build ?? { status: "ready" },
    );
    query("#stage-connection", document).textContent = "";
  } catch {
    query("#stage-connection", document).textContent =
      "Stage connection lost · holding the last view";
  } finally {
    setTimeout(asyncHandler(poll), 1000);
  }
}
void poll();
