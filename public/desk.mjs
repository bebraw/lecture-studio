import { auth, api, escape, surface, renderDiagrams, buildLabel, previewCandidates } from "./shared.mjs";
import { mountExplorer } from "./explore.mjs";
const $ = id => document.getElementById(id), token = auth("desk");
let state, files = [], note, selected, requestKey = "", modelKey = "", draftSequence = 0;
let previewKey = "";
let stageKey = "", stageReadPending = false;
let explorer;
let syncLectureSlide;
let updateBuildSlide;
const call = (path, value) => api(token, path, value);
function notice(text, error = false) { $("notice").hidden = false; $("notice").textContent = text; $("notice").classList.toggle("error", error); }
function action(id, run) { $(id).addEventListener("click", async () => { $(id).disabled = true; try { await run(); } catch (e) { notice(e.message, true); } finally { $(id).disabled = false; if (state) updateRuntime(state); } }); }
function draft() { return { act: state.activeAct, mode: $("mode").value, diagram: $("diagram").value, title: $("title").value, body: $("body").value, source: $("source").value, demoUrl: $("demo-url").value, allowRemoteImages: $("remote-images").checked }; }
function fields(value) { for (const id of ["mode", "diagram", "title", "body", "source"]) $(id).value = value[id] || ""; $("demo-url").value = value.demoUrl || ""; $("remote-images").checked = !!value.allowRemoteImages; }
function preview(data) {
 $("preview").innerHTML = surface(data.draftPreview); void renderDiagrams($("preview"));
 $("word-count").textContent = draft().body.trim().split(/\s+/).filter(Boolean).length + " words";
 $("diagram-field").hidden = $("mode").value !== "diagram"; $("url-field").hidden = $("mode").value !== "demo";
}
async function saveDraft() { const sequence = ++draftSequence; const data = await call("draft", draft()); if (sequence === draftSequence) preview(data); return data; }
function beat() { return state.acts.find(a => a.id === state.activeAct) || state.acts[0]; }
function drawPlot() {
 explorer?.setCue(beat());
 if ($("live-next")) { $("live-next").textContent = beat().title; $("live-question").textContent = beat().question; }
 syncLectureSlide?.();
 $("acts").innerHTML = state.acts.map((a, i) => '<button data-act="' + escape(a.id) + '" class="act ' + (a.id === state.activeAct ? "active" : "") + '"><span class="act-index">0' + (i + 1) + '</span><span><small>' + escape(a.era) + ' · ' + escape(a.time) + '</small><strong>' + escape(a.title) + '</strong></span></button>').join("");
 $("acts").querySelectorAll("button").forEach(button => button.onclick = async () => {
   try { state = await call("act", { act: button.dataset.act }); drawPlot(); $("beat-title").textContent = beat().title; $("beat-question").textContent = beat().question; $("transition").textContent = beat().transition; }
   catch (e) { notice(e.message, true); }
 });
 $("beat-title").textContent = beat().title; $("beat-question").textContent = beat().question; $("transition").textContent = beat().transition;
}
function listNotes() {
 const query = $("search").value.toLowerCase();
 $("note-list").replaceChildren();
 for (const file of files.filter(f => f.label.toLowerCase().includes(query))) {
   const button = document.createElement("button"); button.textContent = file.label; button.className = "note-choice";
   button.onclick = async () => {
     try {
       note = await call("note?path=" + encodeURIComponent(file.path));
       $("sections").innerHTML = note.sections.map((section, i) => '<option value="' + i + '">' + escape(section.heading) + '</option>').join("");
       const preferred = note.sections.findIndex(s => s.heading.toLowerCase() === "stage block");
       $("sections").value = String(Math.max(0, preferred)); $("note-controls").hidden = false; selectSection();
     } catch (e) { notice(e.message, true); }
   };
   $("note-list").append(button);
 }
}
function selectSection() {
 selected = note.sections[Number($("sections").value)];
 $("note-content").innerHTML = selected.html; void renderDiagrams($("note-content"));
 $("selected-note").textContent = note.title; $("selected-note").hidden = false;
}
function updateRuntime(data) {
 void refreshStageView();
 if (data.poll) updatePoll(data.poll);
 if (data.resetVersion !== undefined && state.resetVersion !== data.resetVersion) {
   fields(data.draft); $("brief").value = data.brief; state = data; drawPlot(); preview(data);
 }
 state.resetVersion = data.resetVersion;
 state.rehearsalJob = data.rehearsalJob;
 if ($("rehearsal-status")) {
   const job = data.rehearsalJob || {};
   $("rehearsal-status").textContent = job.status === "creating" ? "Preparing a fresh checkout and installing dependencies…" : job.status === "failed" ? job.error : job.status === "ready" ? "Fresh rehearsal ready." : "";
   $("new-rehearsal").disabled = job.status === "creating";
   $("reset-lecture").disabled = job.status === "creating";
 }
 state = { ...state, libraryStatus: data.libraryStatus, workspace: data.workspace, codex: data.codex, blank: data.blank, stage: data.stage, canReturnToMaterial: data.canReturnToMaterial, lastBrief: data.lastBrief };
 $("show-sent-brief").disabled = !data.lastBrief;
 const c = data.codex;
 updateBuildSlide?.(c);
 updatePreviewShortcuts(data);
 if ($("live-progress")) $("live-progress").textContent = buildLabel(c);
 $("codex-status").textContent = c.status; $("activity").textContent = buildLabel(c); $("workspace").textContent = data.workspace;
 $("send").disabled = c.status !== "ready" || data.rehearsalJob?.status === "creating"; $("interrupt").disabled = !c.turnId;
 $("connect-codex").disabled = c.status !== "disconnected"; $("disconnect-codex").disabled = c.status === "disconnected";
 $("blank").textContent = data.blank ? "Unblank stage" : "Blank stage";
 $("library-status").textContent = "Obsidian · " + data.libraryStatus;
 const notesReady = data.libraryStatus.startsWith("Connected");
 $("notes-signal").textContent = "Obsidian · " + (notesReady ? "ready" : /Unavailable|failed/i.test(data.libraryStatus) ? "unavailable" : "offline");
 $("notes-signal").dataset.state = notesReady ? "ready" : "offline";
 $("codex-signal").textContent = "Codex · " + c.status;
 $("codex-signal").dataset.state = c.status;
 $("load-library").textContent = notesReady ? "Refresh lecture notes" : "Connect Obsidian";
 $("stage-status").textContent = data.blank ? "Stage is blank." : "Published: " + data.stage.title;
 const key = JSON.stringify(c.models);
 if (key !== modelKey) { modelKey = key; const value = $("model").value; $("model").innerHTML = '<option value="">Codex configured default</option>' + c.models.map(m => '<option value="' + escape(m.id) + '">' + escape(m.name) + '</option>').join(""); $("model").value = value; }
 $("messages").replaceChildren();
 for (const message of c.messages) { const pre = document.createElement("pre"); pre.textContent = message.text; $("messages").append(pre); }
 const nextKey = JSON.stringify(c.requests);
 if (nextKey !== requestKey) { requestKey = nextKey; drawRequests(c.requests); }
}
function drawRequests(requests) {
 $("requests").replaceChildren();
 for (const request of requests) {
   const panel = document.createElement("section"); panel.className = "approval";
   const h = document.createElement("h3"); h.textContent = request.method === "item/tool/requestUserInput" ? "Question from Codex" : "Permission request"; panel.append(h);
   const p = document.createElement("pre"); p.textContent = JSON.stringify(request.params, null, 2); panel.append(p);
   const answers = {};
   if (request.method === "item/tool/requestUserInput") {
     for (const question of request.params.questions || []) {
       const label = document.createElement("label"); label.textContent = question.question; const input = document.createElement("input");
       input.addEventListener("input", () => answers[question.id] = input.value); label.append(input); panel.append(label);
       for (const option of question.options || []) { const b = document.createElement("button"); b.textContent = option.label; b.onclick = () => { input.value = option.label; answers[question.id] = option.label; }; panel.append(b); }
     }
   }
   const choices = request.method === "item/tool/requestUserInput" ? [["answer", "Send answers"]] : request.method === "item/permissions/requestApproval" ? [["decline", "Decline broad permissions"]] : [["accept", "Approve once"], ["decline", "Decline"]];
   for (const [decision, label] of choices) {
     const button = document.createElement("button"); button.textContent = label;
     button.onclick = async () => { try { updateRuntime(await call("codex/answer", { id: request.id, decision, answers })); } catch (e) { notice(e.message, true); } };
     panel.append(button);
   }
   $("requests").append(panel);
 }
}
async function init() {
 if (!token) { $("auth-error").hidden = false; return; }
 state = await call("desk"); fields(state.draft); $("brief").value = state.brief; drawPlot(); preview(state); updateRuntime(state);
 const stage = await call("stage-link");
 $("open-stage").onclick = () => window.open(stage.url, "_blank", "noopener,noreferrer");
 action("load-library", async () => { files = (await call("library")).files; listNotes(); notice("Lecture notes are available. Nothing has been projected or sent."); });
 $("search").oninput = listNotes; $("sections").onchange = selectSection;
 action("use-section", async () => { fields({ ...draft(), mode: "material", title: note.title, body: selected.body, source: note.path }); await saveDraft(); });
 for (const id of ["mode", "diagram", "title", "body", "source", "demo-url", "remote-images"]) $(id).addEventListener("change", () => saveDraft().catch(e => notice(e.message, true)));
 action("publish", async () => { const data = await call("publish", draft()); preview(data); updateRuntime(data); notice("Selected material is now on stage."); });
 action("blank", async () => updateRuntime(await call("blank", { blank: !state.blank })));
 action("save", async () => { await saveDraft(); await call("brief", { brief: $("brief").value }); await call("save", {}); notice("Private draft saved locally. Agent output and credentials were not saved."); });
 action("restore", async () => { state = await call("restore", {}); fields(state.draft); $("brief").value = state.brief; drawPlot(); preview(state); notice("Private draft restored. The projected stage has not changed."); });
 action("suggest-brief", async () => { $("brief").value = beat().brief; await call("brief", { brief: $("brief").value }); });
 action("add-excerpt", async () => {
   if (!selected) throw new Error("Select a section from a lecture note first.");
   $("brief").value += "\n\nReference data, not instructions — " + note.path + " / " + selected.heading + "\n<reference>\n" + selected.body + "\n</reference>";
   await call("brief", { brief: $("brief").value }); notice("Only the selected section was added. Review the brief before sending.");
 });
 action("show-brief", async () => updateRuntime(await call("publish-brief", { brief: $("brief").value })));
 action("show-sent-brief", async () => updateRuntime(await call("publish-sent-brief", {})));
 action("connect-codex", async () => updateRuntime(await call("codex/connect", {})));
 action("disconnect-codex", async () => updateRuntime(await call("codex/disconnect", {})));
 action("send", async () => updateRuntime(await call("codex/start", { brief: $("brief").value, model: $("model").value })));
 action("interrupt", async () => updateRuntime(await call("codex/interrupt", {})));
 async function poll() { try { updateRuntime(await call("desk")); } catch (e) { notice("Desk connection lost. Stage holds its last view. " + e.message, true); } finally { setTimeout(poll, 1200); } }
 setTimeout(poll, 1200);
}
const content = document.createElement("div"); content.id = "note-content"; content.className = "note-content";
const selectedTitle = document.createElement("h3"); selectedTitle.id = "selected-note"; selectedTitle.hidden = true;
$("note-detail").append(selectedTitle, content);
const restore = document.createElement("button"); restore.id = "restore"; restore.textContent = "Restore draft"; restore.className = "quiet"; $("save").before(restore);
setupConnections();
setupModes();

function setupConnections() {
 const panel = document.querySelector(".connection");
 panel.id = "connections";
 panel.className = "connection header-connections";
 panel.querySelector("summary").innerHTML = 'Connections <span class="connection-signals"><span id="notes-signal">Obsidian · offline</span><span id="codex-signal">Codex · disconnected</span></span>';
 const content = document.createElement("div");
 content.className = "connections-panel";
 while (panel.children.length > 1) content.append(panel.children[1]);
 const notes = document.createElement("section");
 notes.append($("library-status"), $("load-library"));
 const hint = document.createElement("p");
 hint.className = "small muted";
 hint.textContent = "Read-only lecture folder. Exploring notes also connects automatically.";
 notes.append(hint);
 content.prepend(notes);
 content.insertBefore($("codex-status"), $("workspace"));
 panel.append(content);
 document.querySelector(".top-actions").prepend(panel);
 document.addEventListener("click", event => {
   if (!panel.contains(event.target)) panel.open = false;
 });
 document.addEventListener("keydown", event => {
   if (event.key === "Escape" && panel.open) { panel.open = false; panel.querySelector("summary").focus(); }
 });
}
setupPreviewShortcuts();
setupRehearsals();
setupPoll();
explorer = mountExplorer({ host: document.querySelector(".material-column"), call, getScope: () => state.scope, onShow: async material => {
 const data = await call("publish", { ...draft(), ...material, mode: "material", allowRemoteImages: false });
 fields(data.draft); preview(data); updateRuntime(data);
}});
init().catch(e => { $("auth-error").hidden = false; notice(e.message, true); });

function setupModes() {
 const modes = document.createElement("div"); modes.className = "mode-switch"; modes.setAttribute("aria-label", "Desk mode");
 modes.innerHTML = '<button id="prepare-mode" aria-pressed="false">Prepare</button><button id="present-mode" aria-pressed="true">Present</button>';
 document.querySelector(".top-actions").prepend(modes);
 const live = document.createElement("section"); live.className = "live-overview";
 live.innerHTML = '<div><span class="section-label">ON STAGE NOW</span><h2 id="live-now">Opening question</h2><p id="live-progress" role="status">Not connected</p></div><div><span class="section-label">DISCUSSION CUE · PRIVATE</span><h2 id="live-next"></h2><p id="live-question"></p><div class="button-row"><button id="previous-beat">← Previous cue</button><button id="next-beat">Next cue →</button><button id="use-question">Draft this question</button></div><p class="small muted">Browsing cues does not change the stage or start a build.</p></div>';
 document.querySelector(".desk-grid").before(live);
 live.firstElementChild.remove();
 const audienceSlides = [
   ["Opening · title","Web development: past, present, and possible futures","Understand how the web evolved—and explore where it might go by building an application together."],
   ["Opening · your experience","When you use the web today, what feels unnecessarily difficult?","Take at least two minutes to discuss with a neighbour. Choose one example to share.\n\nFinding information · Repeating information · Navigating interfaces · Knowing what to trust"],
   ["Opening · shared experiment","We will build one application—and change how we use it.","You help choose the direction. An agent helps implement it. Together, we inspect what actually works."],
   ["Past · chapter","Past — Documents become interactive","How does a page communicate what we can do?"],
   ["Past · links","A link offers a next step.","An address identifies a resource. A link lets us reach it."],
   ["Past · predict","What will still work if we remove the styling and JavaScript?","Make a prediction before we try it."],
   ["Past · forms","Forms turn reading into action.","A form communicates an action, its inputs, and where the request will go."],
   ["Past · enhancement","Keep the capability. Add the convenience.","Progressive enhancement starts with a working core, then adds presentation and richer interaction."],
   ["Past → present · improve","The capability works. What would make the interaction better?","Suggest one change—and explain who it would help."],
   ["Present · chapter","Present — The browser becomes an application","What do we gain when the interface responds without a new page?"],
   ["Present · shared experiment","One room. A changing result.","Make a choice. Watch how the shared view responds."],
   ["Present · tradeoffs","What does faster feedback add—and what does it hide?","Compare the two versions. Name one benefit and one cost."],
   ["Present → future · another client","A person can use this. What would another client need to understand it?","Think about the available actions, required input, and resulting state."],
   ["Future · chapter","Future — Who constructs the interface?","Existing applications can become clearer to agents. Agents may also compose interfaces around services.\n\nTwo hypotheses that can coexist."],
   ["Future · stable or generated?","Which applications need a stable interface, and which could use a generated one?","Choose one example of each. What makes the difference?"],
   ["Future · shared capability","Can people and agents use the same underlying capability?","Different interfaces need not mean independently maintained rules."],
   ["Future · context","What context would improve this result—and what should remain private?","Name one useful piece of context and one boundary you would set."],
   ["Closing · return","If the interface changes, what should remain dependable?","Return to your opening frustration. Does what we built help—or move the problem somewhere else?"],
   ["Closing · next step","What would you investigate or build next?","One question. One counterexample. One practical experiment."]
 ];
 const slideActs=["opening","opening","opening","document","document","document","forms","forms","forms","application","application","application","application","agents","agents","agents","context","synthesis","synthesis"];
 const slideGuides=["00–03 · Establish the two threads: web history and direction, demonstrated through agentic development.","03–08 · Hear two examples. Remember them for the closing discussion. Use a show of hands if the room app is not ready.","08–12 · Explain the prepared template and recorded context. Invite a visual-theme choice. Show the real prompt before sending it; build in the background, not automatically.","12–15 · Start Document A when ready. Use the hypermedia definition and diagram while it runs. These are overlapping approaches, not replacement eras.","15–20 · Show a real link, its URL and browser navigation. Connect distributed information to the audience’s experience, rather than listing dates.","20–24 · Take predictions, then inspect the running result. If the build is unfinished, inspect the prepared baseline.","24–29 · Start Document B using the prepared room. Explain native submission while it builds; inspect the actual request and response.","29–34 · Use the enhancement definition and layers. Test without JavaScript. Discuss keyboard access; semantic HTML alone is not proof of accessibility.","34–38 · Gather suggestions. Carry one into the Present prompt; do not promise every suggestion will be implemented.","38–41 · Start the Present build. Show its prompt and explain what is preserved from the native form.","41–49 · Invite predefined votes once deployed and reachable. Compare two browser views. If unavailable, demonstrate locally without pretending the audience is connected.","49–54 · Give frameworks credit. Discuss state, latency, failure and discoverability through the actual app, not a technology list.","54–58 · Inspect the form or shared contract. Distinguish explicit actions from behavior that must be inferred.","58–62 · Start constrained Future composition when inputs are ready. Explain that the agent building this app and an agent using it are different roles.","62–70 · Give pairs two minutes, then discuss examples while the build runs. Use the two-directions diagram. This is a position, not a proven forecast.","70–76 · Inspect the generated result and shared constraints. Explain the drift risk of duplicate contracts, without claiming separate APIs are always wrong.","76–83 · Show the actual context receipt. Distinguish aggregate audience choices from personal data; discuss profiling and incorrect assumptions.","83–88 · Return to the examples students gave. Invite a counterexample to the shared-capability hypothesis.","88–90+ · Leave space for students. Offer the free SDLCAI tickets as an optional continuation, not a required action. Use slack up to 105 minutes for discussion."];
 const buildSlides=new Map();
 for(const [after,act,title] of [[13,"agents","Build · Compose a constrained interface"],[9,"application","Build · Make the room interactive"],[6,"forms","Build · Add the native voting form"],[3,"document","Build · Create the seminar document"]]){
   audienceSlides.splice(after+1,0,["Live build",title,""]);
   slideActs.splice(after+1,0,act);
   slideGuides.splice(after+1,0,"Review the prompt with the audience. Start explicitly, then continue the discussion while the agent works. Inspect the result when ready; do not wait on this slide.");
 }
 audienceSlides.forEach((slide,index)=>{if(slide[0]==="Live build")buildSlides.set(index,slideActs[index]);});
 const launch=document.createElement("button");launch.id="start-slide-build";launch.className="primary";launch.textContent="Start this build";launch.hidden=true;
 $("next-beat").parentElement.append(launch);
 const launchStatus=document.createElement("span");launchStatus.className="small muted";launchStatus.id="slide-build-status";launch.after(launchStatus);
 const guide=document.createElement('p');guide.className='small muted';guide.id='lecture-guide';live.lastElementChild.append(guide);
 let slideIndex=0, slideBusy=false, lectureReset;
 const startedSlides=new Set();
 const promptFor=index=>state.acts.find(a=>a.id===buildSlides.get(index))?.brief||"";
 updateBuildSlide=c=>{
   const isBuild=buildSlides.has(slideIndex);
   launch.hidden=!isBuild;launchStatus.hidden=!isBuild;
   launch.disabled=c.status!=="ready"||startedSlides.has(slideIndex);
   launchStatus.textContent=startedSlides.has(slideIndex)?"Started · continue to the next discussion slide.":c.status==="ready"?"Sends the prompt displayed on this slide.":"Connect Codex or finish the current turn before starting.";
 };
 action("start-slide-build",async()=>{
   if(!buildSlides.has(slideIndex)||startedSlides.has(slideIndex)||state.codex.status!=="ready")return;
   const index=slideIndex, brief=promptFor(index);
   // Re-show the exact prompt so an intervening excerpt cannot obscure what is sent.
   await showLectureSlide(index);
   const data=await call("codex/start",{brief,model:$("model").value});
   startedSlides.add(index);$("brief").value=brief;updateRuntime(data);updateBuildSlide(data.codex);
 });
 syncLectureSlide=()=>{
   if(lectureReset!==state.resetVersion){slideIndex=0;lectureReset=state.resetVersion;startedSlides.clear();}
   if(slideActs[slideIndex]!==state.activeAct)slideIndex=Math.max(0,slideActs.indexOf(state.activeAct));
   const [label,title,body]=audienceSlides[slideIndex];
   live.querySelector(".section-label").textContent="LECTURE · "+(slideIndex+1)+" / "+audienceSlides.length+" · "+label;
   $("live-next").textContent=title;$("live-question").textContent=buildSlides.has(slideIndex)?promptFor(slideIndex):body;
   updateBuildSlide(state.codex);
   guide.textContent="PRIVATE · "+slideGuides[slideIndex];
 };
 const showLectureSlide=async(index)=>{
   if(slideBusy)return;slideBusy=true;
   try{
     const [,title,body]=audienceSlides[index];
     const data=await call("publish",{...draft(),act:slideActs[index],mode:buildSlides.has(index)?"brief":"question",title,body:buildSlides.has(index)?promptFor(index):body,source:""});
     state=await call("act",{act:slideActs[index]});slideIndex=index;
     fields(data.draft);preview(data);updateRuntime(state);drawPlot();
     if (!$("notice").classList.contains("error")) $("notice").hidden = true;
   }finally{slideBusy=false;}
 };
 $("previous-beat").textContent="← Previous slide";
 $("next-beat").textContent="Next slide →";
 live.lastElementChild.querySelector("p.small").textContent="Previous and Next show the slide to the room. They never start a build.";
 const stagePanel = document.createElement("section"); stagePanel.id = "current-stage-panel";
 stagePanel.innerHTML = '<div class="section-heading"><span class="section-label">ON STAGE</span><span id="live-progress" class="small muted"></span></div><div id="current-stage" class="preview stage-surface"></div>';
 document.querySelector(".material-column").prepend(stagePanel);
 const stageControls = document.querySelector(".publish-row");
 const controlsHome = document.createElement("div");
 stageControls.before(controlsHome);
 const cueControls = document.createElement("div"); cueControls.className = "cue-stage-controls";
 live.lastElementChild.append(cueControls);
 $("use-question").remove();
 $("next-beat").className = "primary";
 const placeStageControls = () => {
   const inPresent = document.body.classList.contains("presenting") && !document.body.classList.contains("finding");
   controlsHome.append(stageControls);
   (inPresent ? $("next-beat").parentElement : stageControls).append($("blank"));
 };
 const find = document.createElement("button"); find.id = "find-material"; find.textContent = "Find something…"; find.className = "quiet";
 const done = document.createElement("button"); done.id = "finish-finding"; done.textContent = "Done · back to presenting"; done.className = "primary";
 $("open-stage").before(find, done);
 const setMode = mode => {
   if (mode === "present") { document.querySelector(".connection").open = false; document.querySelector(".output").open = false; }
   document.body.classList.toggle("presenting", mode === "present");
   document.body.classList.remove("finding");
   placeStageControls();
   sessionStorage.setItem("lecture-studio-mode", mode);
   $("prepare-mode").setAttribute("aria-pressed", String(mode === "prepare"));
   $("present-mode").setAttribute("aria-pressed", String(mode === "present"));
 };
 $("prepare-mode").onclick = () => setMode("prepare");
 $("present-mode").onclick = () => setMode("present");
 find.onclick = () => { document.body.classList.add("finding"); placeStageControls(); $("search").focus(); };
 done.onclick = () => { document.body.classList.remove("finding"); placeStageControls(); find.focus(); };
 document.addEventListener("keydown", event => { if (event.key === "Escape" && document.body.classList.contains("finding")) done.click(); });
 for (const [id, step] of [["previous-beat", -1], ["next-beat", 1]]) action(id, async () => {
   await showLectureSlide(Math.min(audienceSlides.length-1,Math.max(0,slideIndex+step)));
 });
 setMode(sessionStorage.getItem("lecture-studio-mode") || "present");
}

async function refreshStageView() {
 if (stageReadPending || !$("current-stage")) return;
 stageReadPending = true;
 try {
   const shown = await call("stage");
   const key = JSON.stringify([shown.version, shown.blank]);
   if (key !== stageKey) {
     stageKey = key;
     $("current-stage").classList.toggle("stage-blank-preview", shown.blank);
     $("current-stage").innerHTML = shown.blank ? '<p>Stage is blank</p>' : shown.mode === "demo"
       ? '<h1>' + escape(shown.title) + '</h1><p>Live app is on the projected stage.</p><p class="small">' + escape(shown.demoUrl) + '</p>'
       : surface(shown);
     void renderDiagrams($("current-stage"));
   }
 } catch { /* Keep the last stage view; the desk connection notice handles server failures. */ }
 finally { stageReadPending = false; }
}

function setupPreviewShortcuts() {
 const panel = document.createElement("section"); panel.id = "preview-shortcuts"; panel.hidden = true;
 panel.innerHTML = '<span class="section-label">PREVIEW FROM CODEX</span><p class="small muted">Agent-supplied link · availability not checked</p><label for="preview-choice" class="sr-only">Choose preview URL</label><select id="preview-choice"></select><div class="button-row"><a id="open-preview" target="_blank" rel="noopener noreferrer">Open privately ↗</a><button id="show-preview">Show on stage →</button></div>';
 document.querySelector(".builder .section-heading").after(panel);
 $("preview-choice").onchange = () => { $("open-preview").href = $("preview-choice").value; };
 action("show-preview", async () => {
   const url = $("preview-choice").value;
   if (!url) throw new Error("Choose a preview first");
   updateRuntime(await call("show-preview", { url }));
 });
 action("back-material", async () => updateRuntime(await call("back-material", {})));
}
function updatePreviewShortcuts(data) {
 const urls = previewCandidates(data.codex.messages, location.origin);
 const key = JSON.stringify(urls);
 if (key !== previewKey) {
   previewKey = key;
   const selectedUrl = $("preview-choice").value;
   $("preview-choice").innerHTML = urls.map(url => '<option value="' + escape(url) + '">' + escape(url) + '</option>').join("");
   if (urls.includes(selectedUrl)) $("preview-choice").value = selectedUrl;
   $("open-preview").href = $("preview-choice").value || "#";
 }
 $("preview-shortcuts").hidden = !urls.length;
 $("preview-choice").hidden = !urls.length;
 $("open-preview").hidden = !urls.length;
 $("show-preview").hidden = !urls.length;
 $("back-material").hidden = !data.canReturnToMaterial || !["demo", "brief", "poll"].includes(data.stage.mode);
}

let pollConfigKey = "", pollRefreshing = false, lastPollRefresh = 0;
function setupPoll() {
 const panel=document.createElement("details");panel.className="audience-poll";
 panel.innerHTML='<summary>Audience vote</summary><div class="poll-prepare"><p class="small muted">The public room must already have these exact option IDs and labels. This never seeds or resets votes.</p><label>Question<input id="poll-question"></label><label>Options · one id|label per line<textarea id="poll-options" rows="3"></textarea></label><label>Default option ID<input id="poll-default"></label><button id="poll-configure">Save poll definition</button></div><p id="poll-question-live"></p><a id="poll-join" target="_blank" rel="noopener noreferrer">Audience join link ↗</a><p id="poll-status" class="small" role="status"></p><div id="poll-counts"></div><div class="button-row"><button id="poll-open">Open vote</button><button id="poll-lock">Close vote</button><button id="poll-show">Show vote on stage</button><button id="poll-add">Add result to prompt</button></div>';
 document.querySelector(".builder").append(panel);
 action("poll-configure",async()=>updateRuntime(await call("poll/configure",{question:$("poll-question").value,options:$("poll-options").value.split("\n").filter(Boolean).map(line=>{const [id,...label]=line.split("|");return {id:id.trim(),label:label.join("|").trim()};}),defaultId:$("poll-default").value.trim()})));
 for(const op of ["open","lock","show"])action("poll-"+op,async()=>updateRuntime(await call("poll/"+op,{})));
 action("poll-add",async()=>{
   const {text}=await call("poll/receipt",{});
   if(!$("brief").value.includes(text)) $("brief").value += "\n\n"+text;
   await call("brief",{brief:$("brief").value});
   notice("Frozen result added to the editable prompt. Nothing was sent or projected.");
 });
}
function updatePoll(p) {
 const configKey=JSON.stringify(p.config);
 if(configKey!==pollConfigKey){pollConfigKey=configKey;$("poll-question").value=p.config.question;$("poll-options").value=p.config.options.map(o=>o.id+"|"+o.label).join("\n");$("poll-default").value=p.config.defaultId;}
 $("poll-question-live").textContent=p.config.question;
 $("poll-join").hidden=!p.joinUrl;$("poll-join").href=p.joinUrl||"#";
 $("poll-status").textContent=!p.configured?"Configure the public room connection in the server environment.":p.error|| (p.frozen?"Closed · "+p.frozen.winner.label+" · "+p.frozen.reason:p.busy?"Contacting audience room…":p.snapshot?.status||"Ready to connect");
 $("poll-counts").textContent=(p.frozen?.choices||p.snapshot?.choices||[]).map(c=>c.label+": "+c.votes).join(" · ");
 $("poll-open").disabled=!p.configured||p.busy||!!p.frozen||p.snapshot?.status==="open";
 $("poll-lock").disabled=!p.configured||p.busy||!!p.frozen;
 $("poll-add").disabled=!p.frozen;
 $("poll-configure").disabled=p.busy||!!p.frozen||p.snapshot?.status==="open";
 if(p.snapshot?.status==="open"&&!p.frozen&&!p.busy&&!pollRefreshing&&Date.now()-lastPollRefresh>3000){
   pollRefreshing=true;lastPollRefresh=Date.now();
   call("poll/refresh",{}).then(updateRuntime).catch(()=>{}).finally(()=>pollRefreshing=false);
 }
}
function setupRehearsals() {
 const panel = document.createElement("section"); panel.className = "rehearsal-controls";
 panel.innerHTML = '<span class="section-label">REHEARSAL</span><p class="small muted">Reset the lecture, or start in a fresh project folder. Previous checkouts and saved material stay intact.</p><div class="button-row"><button id="reset-lecture">Reset lecture…</button><button id="new-rehearsal">New rehearsal…</button></div><p id="rehearsal-status" role="status" class="small"></p>';
 document.querySelector(".plot").append(panel);
 for (const [id, question] of [
   ["reset-lecture", "Return to the opening and discard the current unsaved lecture draft? This disconnects Codex and stops its owned process group. Project files and saved material stay intact."],
   ["new-rehearsal", "Create a fresh numbered checkout from lecture-start-v10? Once ready, this resets the lecture and disconnects the previous Codex session. Existing checkouts and saved material are kept."]
 ]) action(id, async () => {
   if (!window.confirm(question)) return;
   updateRuntime(await call(id, { confirm: true }));
 });
}
