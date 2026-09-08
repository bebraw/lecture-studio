import { auth, api, surface, renderDiagrams, buildLabel } from "./shared.mjs";
const token = auth("stage"); let version = -1;
async function poll() {
 try {
   const state = await api(token, "stage");
   document.body.classList.toggle("blank", state.blank);
   if (state.version !== version) {
     version = state.version;
     document.querySelector("#stage-content").innerHTML = surface(state);
     document.querySelector("#stage-content").dataset.mode = state.mode;
     document.querySelector("#era").textContent = state.act.replaceAll("-", " ").toUpperCase();
     document.querySelector("#source-credit").textContent = state.source;
     void renderDiagrams(document.querySelector("#stage-content"));
   }
   document.querySelector("#build-signal").textContent = buildLabel(state.build);
   document.querySelector("#stage-connection").textContent = "";
 } catch {
   document.querySelector("#stage-connection").textContent = "Stage connection lost · holding the last view";
 } finally { setTimeout(poll, 1000); }
}
void poll();
