import { asyncHandler } from "../shared/errors.ts";
import { query } from "./dom.ts";
import {
  auth,
  api,
  surface,
  renderDiagrams,
  createStageStatus,
  applyTheme,
} from "./shared.ts";
const token = auth("stage");
let version: string | number = -1;
const updateStatus = createStageStatus();
async function poll() {
  try {
    const state = await api(token, "stage");
    document.body.classList.toggle("blank", state.blank);
    updateStatus(state);
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
    query("#stage-connection", document).textContent = "";
  } catch {
    query("#stage-connection", document).textContent =
      "Stage connection lost · holding the last view";
  } finally {
    setTimeout(asyncHandler(poll), 1000);
  }
}
void poll();
