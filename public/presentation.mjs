import {surface,renderDiagrams,applyTheme} from "./shared.mjs";
export function mountPresentations({call,update}){
 const setup=document.createElement("section");setup.id="presentation-setup";
 setup.innerHTML='<h2>Presentation</h2><button id="presentations-list">Find presentations in Obsidian</button><select id="presentation-choice" aria-label="Presentation"></select><button id="presentation-load">Load snapshot / restart presentation</button><button id="presentation-unload">Use original lecture</button><p id="presentation-message" role="status"></p>';
 document.querySelector(".plot").before(setup);
 const rehearsalControls=document.querySelector(".rehearsal-controls");if(rehearsalControls)setup.append(rehearsalControls);
 const outline=document.createElement("nav");outline.id="presentation-outline";outline.setAttribute("aria-label","Presentation outline");
 document.querySelector(".plot").before(outline);
 const panel=document.createElement("section");panel.id="graph-presentation";panel.hidden=true;
 panel.innerHTML='<span id="graph-label" class="section-label"></span><h2 id="graph-title"></h2><p id="graph-notes" class="small muted"></p><pre id="graph-prompt"></pre><div id="graph-detours" class="button-row"></div><div class="button-row"><button id="graph-previous">Previous</button><button id="graph-next" class="primary">Begin presentation</button><button id="graph-return">Return to narrative</button><button id="graph-defaults">Use declared defaults</button><button id="graph-build">Start this build</button><button id="graph-open">Open voting</button><button id="graph-close">Close voting</button></div><p id="graph-status" role="status"></p>';
 document.querySelector(".desk-grid").before(panel);
 const $=id=>document.getElementById(id);
 const show=document.createElement("button");show.id="graph-show";show.textContent="Show to room";$("graph-next").after(show);
 const details=document.createElement("details");details.id="presentation-details";
 const summary=document.createElement("summary");summary.textContent="Details";details.append(summary);
 const notes=document.createElement("section");notes.id="presentation-detail-content";
 details.append(outline,notes);panel.append(details);
 notes.append($("graph-notes"),$("graph-prompt"));
 const modelLabel=$("model").closest("label");notes.append(modelLabel);
 notes.append($("activity"),$("interrupt"),$("requests"),$("messages"),$("preview-shortcuts"),$("back-material"));
 const stagePanel=$("current-stage-panel");$("graph-detours").before(stagePanel);
 $("graph-next").parentElement.append($("graph-detours"));
 const name=document.createElement("span");name.id="presentation-name";document.querySelector(".brand").after(name);
 const setDetailsMode=()=>{details.open=!document.body.classList.contains("presenting");};
 $("prepare-mode").addEventListener("click",setDetailsMode);
 $("present-mode").addEventListener("click",setDetailsMode);
 $("presentations-list").textContent="Connect Obsidian";
 $("presentation-load").textContent="Load";
 $("presentation-unload").textContent="Unload";
 $("presentation-unload").hidden=true;
 $("presentation-choice").hidden=true;$("presentation-load").hidden=true;
 setup.querySelector("h2").remove();
 let data, begun=false, snapshot="", outlineKey="", previewKey="";
 let refreshing=false;
 setInterval(async()=>{
   if(refreshing||data?.presentation?.step.type!=="poll"||data.graphPoll?.snapshot?.status!=="open"||data.graphPoll?.frozen)return;
   refreshing=true;try{update(await call("presentation/poll-refresh",{}));}catch(e){$("graph-status").textContent=e.message;}finally{refreshing=false;}
 },3000);
 async function run(op,body={}){
   try{const result=await call("presentation/"+op,body);begun=!["load","unload","select"].includes(op);update(result);}
   catch(e){$("graph-status").textContent=e.message;$("presentation-message").textContent=e.message;}
 }
 const preparing=()=>!document.body.classList.contains("presenting");
 function neighbour(direction){
   const p=data?.presentation;if(!p)return;
   if(direction==="next")return p.step.next||p.outline.find(s=>(s.related||[]).includes(p.current))?.next;
   return p.outline.find(s=>s.next===p.current)?.id||p.outline.find(s=>(s.related||[]).includes(p.current))?.id;
 }
 let navigating=false;
 async function navigate(direction){
   if(navigating)return;
   navigating=true;
   try{
     if(preparing()){const id=neighbour(direction);if(id)await run("select",{id});}
     else await run(direction==="next"&&!begun?"show":direction);
   }finally{navigating=false;}
 }
 show.onclick=()=>run("show");
 document.addEventListener("keydown",event=>{
   if(!data?.presentation||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest("input,textarea,select,[contenteditable],dialog,[role=dialog]"))return;
   if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
   event.preventDefault();if(!event.repeat)void navigate(event.key==="ArrowLeft"?"previous":"next");
 });
 $("presentations-list").onclick=async()=>{
   $("presentations-list").disabled=true;
   try{
     const {files}=await call("library");
     $("presentation-choice").replaceChildren(...files.filter(f=>f.path.includes("/Presentations/")).map(f=>new Option(f.label,f.path)));
     $("presentation-choice").hidden=!$("presentation-choice").options.length;
     $("presentation-load").hidden=!$("presentation-choice").options.length;
     $("presentations-list").textContent="Refresh list";
     $("presentation-message").textContent=$("presentation-choice").options.length?"":"No presentations found.";
   }catch(e){$("presentation-message").textContent=e.message;}
   finally{$("presentations-list").disabled=false;}
 };
 $("presentation-load").onclick=()=>run("load",{path:$("presentation-choice").value});
 $("presentation-unload").onclick=()=>run("unload");
 for(const [id,op] of [["previous","previous"],["return","return"],["defaults","defaults"],["open","poll-open"],["close","poll-close"]])$("graph-"+id).onclick=()=>run(op);
 $("graph-next").onclick=()=>navigate("next");
 $("graph-previous").onclick=()=>navigate("previous");
 $("graph-build").onclick=()=>run("build",{model:$("model").value});
 return value=>{
   data=value;const p=data.presentation;
   document.body.classList.toggle("using-presentation",!!p);panel.hidden=!p;
   name.textContent=p?.title||"";
   $("presentation-unload").hidden=!p;
   outline.hidden=!p;
   const key=JSON.stringify([p?.loadedAt,p?.outline]);
   if(key!==outlineKey){
   outlineKey=key;outline.replaceChildren();
   if(!p){snapshot="";return;}
   const detours=new Set(p.outline.flatMap(s=>s.related||[]));
   let chapter="";
   const addStep=(s,parent)=>{
     const b=document.createElement("button");b.className="outline-step";b.dataset.stepId=s.id;b.setAttribute("aria-current",s.id===p.current?"step":"false");
     if(parent){b.classList.add("outline-related");b.dataset.relatedTo=parent;b.title="Related slide";}
     b.textContent=s.title;
     b.onclick=()=>run("select",{id:s.id});outline.append(b);
   };
   for(const s of p.outline.filter(s=>!detours.has(s.id))){
     const group=s.chapter||"Narrative";
     if(group!==chapter){chapter=group;const h=document.createElement("h3");h.textContent=group;outline.append(h);}
     addStep(s);
     for(const id of s.related||[]){const related=p.outline.find(step=>step.id===id);if(related)addStep(related,s.id);}
   }
   }
   if(!p)return;
   applyTheme($("current-stage"),p.theme);
   for(const button of outline.querySelectorAll("[data-step-id]"))button.setAttribute("aria-current",button.dataset.stepId===p.current?"step":"false");
   const nextPreview=JSON.stringify(p.preview);
   if(nextPreview!==previewKey){previewKey=nextPreview;$("current-stage").classList.remove("stage-blank-preview");$("current-stage").innerHTML=surface(p.preview);void renderDiagrams($("current-stage"));}
   if(snapshot!==p.loadedAt){begun=false;snapshot=p.loadedAt;setDetailsMode();}
   if(data.codex.requests?.length)details.open=true;
   $("presentation-choice").title="Loaded: "+p.title+" · "+p.loadedAt;
   $("graph-label").textContent=p.step.chapter||"";
   $("graph-title").textContent=p.step.title;
   $("graph-title").classList.add("sr-only");
   $("graph-notes").textContent=p.step.notes||"";$("graph-notes").hidden=!p.step.notes;
   $("graph-prompt").hidden=p.step.type!=="build";$("graph-prompt").textContent=p.resolved.prompt;
   $("graph-next").textContent=preparing()||begun?"Next →":"Show to room";$("graph-next").disabled=preparing()?!neighbour("next"):begun&&!p.step.next;
   $("graph-previous").textContent="← Previous";
   $("graph-previous").disabled=preparing()?!neighbour("previous"):!p.canPrevious;$("graph-return").hidden=!p.canReturn;
   show.hidden=!preparing();
   $("graph-detours").replaceChildren(...p.related.map(s=>{const b=document.createElement("button");b.textContent=s.title;b.onclick=()=>run("detour",{id:s.id});return b;}));
   $("graph-defaults").hidden=!p.resolved.missing.length;
   $("graph-build").hidden=p.step.type!=="build";
   $("graph-build").disabled=p.resolved.missing.length>0||data.codex.status!=="ready"||p.runs.some(r=>r.step===p.current);
   for(const id of ["open","close"]){$("graph-"+id).hidden=p.step.type!=="poll";$("graph-"+id).disabled=!data.graphPoll?.configured||!!data.graphPoll?.frozen;}
 };
}
