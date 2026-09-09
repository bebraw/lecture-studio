import { auth, api, surface, renderDiagrams, buildLabel, applyTheme } from "./shared.mjs";
const token = auth("stage"); let version = -1;
const slideNumber=document.createElement("span");slideNumber.id="slide-number";
document.querySelector(".stage-bottom").append(slideNumber);
const progress=document.createElement("progress");progress.id="slide-progress";progress.max=1;progress.setAttribute("aria-label","Lecture progress");
document.body.append(progress);
async function poll() {
 try {
   const state = await api(token, "stage");
   document.body.classList.toggle("blank", state.blank);
   slideNumber.textContent=state.slidePosition?"Slide "+state.slidePosition.number+" / "+state.slidePosition.total:"";
   progress.hidden=state.slidePosition?.progress==null;
   progress.value=state.slidePosition?.progress??0;
   if (state.version !== version) {
     version = state.version;
     applyTheme(document.body,state.theme);
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
