import {surface,renderDiagrams,applyTheme} from "./shared.mjs";
export function mountPresentations({call,update}){
 const setup=document.createElement("section");setup.id="presentation-setup";
 setup.innerHTML='<h2>Presentation</h2><button id="presentations-list">Find presentations in Obsidian</button><select id="presentation-choice" aria-label="Presentation"></select><button id="presentation-load">Load snapshot / restart presentation</button><button id="presentation-unload">Use original lecture</button><p id="presentation-message" role="status"></p>';
 document.querySelector(".plot").before(setup);
 const rehearsalControls=document.querySelector(".rehearsal-controls");
 const session=document.createElement("details");session.id="session-menu";
 session.innerHTML='<summary>Session</summary><div class="session-actions"><button id="restart-presentation">Restart presentation…</button></div>';
 document.querySelector(".top-actions").append(session);
 if(rehearsalControls)session.querySelector(".session-actions").append(rehearsalControls);
 const outline=document.createElement("nav");outline.id="presentation-outline";outline.setAttribute("aria-label","Presentation outline");
 document.querySelector(".plot").before(outline);
 const panel=document.createElement("section");panel.id="graph-presentation";panel.hidden=true;
 panel.innerHTML='<span id="graph-label" class="section-label"></span><h2 id="graph-title"></h2><p id="graph-notes" class="small muted"></p><pre id="graph-prompt"></pre><div id="graph-detours" class="button-row"></div><div class="button-row"><button id="graph-previous">Previous</button><button id="graph-next" class="primary">Begin presentation</button><button id="graph-return">Return to narrative</button><button id="graph-defaults">Use declared defaults</button><button id="graph-build">Start this build</button><button id="graph-open">Open voting</button><button id="graph-close">Close voting</button></div><p id="graph-status" role="status"></p>';
 document.querySelector(".desk-grid").before(panel);
 const $=id=>document.getElementById(id);
 const liveToggle=document.createElement("button");liveToggle.id="live-toggle";liveToggle.setAttribute("aria-pressed","false");
 liveToggle.textContent="Live off";liveToggle.title="Off: audience waits while you prepare privately. On: broadcast the selected slide.";
 document.querySelector(".mode-switch").append(liveToggle);
 $("prepare-mode").hidden=true;$("present-mode").hidden=true;
 let liveChanging=false;
 liveToggle.onclick=async()=>{if(liveChanging)return;liveChanging=true;liveToggle.disabled=true;try{await run("live",{live:!data?.live});}finally{liveChanging=false;liveToggle.disabled=!data?.presentation;}};
 const syncLive=()=>{const on=document.body.classList.contains("presenting");liveToggle.textContent=on?"Live on":"Live off";liveToggle.setAttribute("aria-pressed",String(on));};
 $("prepare-mode").addEventListener("click",syncLive);$("present-mode").addEventListener("click",syncLive);
 $("prepare-mode").click();
 $("open-stage").textContent="Stage ↗";
 $("open-stage").title="Open projected stage";
 $("open-stage").setAttribute("aria-label","Open projected stage");
 const details=document.createElement("details");details.id="presentation-details";
 const summary=document.createElement("summary");summary.textContent="Notes";details.append(summary);
 const notes=document.createElement("section");notes.id="presentation-detail-content";
 details.append(notes);panel.append(outline,details);
 notes.append($("graph-notes"),$("graph-prompt"));
 const modelLabel=$("model").closest("label");
 const codexControls=document.createElement("div");codexControls.id="codex-controls";
 codexControls.append(modelLabel,$("activity"),$("interrupt"));
 document.querySelector(".connections-panel").append(codexControls);
 notes.append($("requests"));
 const output=document.createElement("details");output.id="build-output";
 const outputSummary=document.createElement("summary");outputSummary.textContent="Build output";output.append(outputSummary,$("messages"),$("preview-shortcuts"),$("back-material"));notes.append(output);
 const stagePanel=$("current-stage-panel");$("graph-detours").before(stagePanel);
 const projectionStatus=document.createElement("span");projectionStatus.id="projection-status";projectionStatus.className="small muted";projectionStatus.setAttribute("role","status");
 $("graph-next").parentElement.append(projectionStatus);
 $("graph-next").parentElement.append($("live-progress"));
 stagePanel.querySelector(".section-heading").remove();
 $("graph-detours").remove();
 const picker=document.createElement("div");picker.id="presentation-picker";
 const name=document.createElement("button");name.id="presentation-name";name.setAttribute("aria-expanded","false");name.setAttribute("aria-controls","presentation-setup");
 picker.append(name,setup);document.querySelector(".brand").after(picker);setup.hidden=true;
 setup.append($("restart-presentation"));
 if(rehearsalControls)document.querySelector(".connections-panel").append(rehearsalControls);
 session.remove();
 const closePicker=()=>{setup.hidden=true;name.setAttribute("aria-expanded","false");};
 name.onclick=()=>{if(data?.presentation&&document.body.classList.contains("presenting"))return;setup.hidden=!setup.hidden;name.setAttribute("aria-expanded",String(!setup.hidden));};
 picker.addEventListener("keydown",event=>{if(event.key==="Escape"){closePicker();name.focus();event.stopPropagation();}});
 document.addEventListener("click",event=>{if(!picker.contains(event.target))closePicker();});
 const setDetailsMode=()=>{details.open=true;};
 $("prepare-mode").addEventListener("click",setDetailsMode);
 $("present-mode").addEventListener("click",()=>{closePicker();name.disabled=true;setDetailsMode();});
 $("prepare-mode").addEventListener("click",()=>{name.disabled=false;});
 $("presentations-list").textContent="Refresh list";
 $("presentation-load").textContent="Load";
 $("presentation-unload").remove();
 $("reset-lecture").hidden=true;
 $("new-rehearsal").textContent="Start fresh app workspace…";
 $("restart-presentation").onclick=async()=>{
   if(!data?.presentation||!confirm("Restart this presentation from its latest Obsidian content? Slide position and recorded presentation decisions will reset. App workspace files will stay intact."))return;
   if(await run("load",{path:data.presentation.path}))closePicker();
 };
 $("presentation-choice").hidden=true;$("presentation-load").hidden=true;
 setup.querySelector("h2").remove();
 let data, snapshot="", outlineKey="", previewKey="";
 let refreshing=false;
 setInterval(async()=>{
   if(preparing()||refreshing||data?.presentation?.step.type!=="poll"||data.graphPoll?.snapshot?.status!=="open"||data.graphPoll?.frozen)return;
   refreshing=true;try{update(await call("presentation/poll-refresh",{}));}catch(e){$("graph-status").textContent=e.message;}finally{refreshing=false;}
 },3000);
 async function run(op,body={}){
   try{const result=await call("presentation/"+op,body);update(result);return true;}
   catch(e){$("graph-status").textContent=e.message;$("presentation-message").textContent=e.message;}
 }
 const preparing=()=>!document.body.classList.contains("presenting");
 function neighbour(direction){
   const p=data?.presentation;if(!p)return;
   if(direction==="next")return p.step.next||p.outline.find(s=>(s.related||[]).includes(p.current))?.next;
   return p.outline.find(s=>s.next===p.current)?.id||p.outline.find(s=>(s.related||[]).includes(p.current))?.id;
 }
 let navigating=false,relatedParent="";
 async function selectSlide(id,parent){
   if(navigating)return;
   navigating=true;
   relatedParent=parent||"";
   try{
     if(!preparing()&&parent===data.presentation.current)await run("detour",{id});
     else if(await run("select",{id})){if(!preparing())await run("show");}
   }finally{navigating=false;}
 }
 function revealSelectedSlide(){
   const bounds=outline.getBoundingClientRect();
   const top=bounds.top+outline.clientTop,bottom=top+outline.clientHeight;
 const offsets=[...outline.querySelectorAll('[aria-current="step"]')].map(button=>{
     const rect=button.getBoundingClientRect();
     return {button,offset:rect.top<top?rect.top-top:rect.bottom>bottom?rect.bottom-bottom:0};
   });
   if(offsets.length){
     const selected=offsets.sort((a,b)=>Math.abs(a.offset)-Math.abs(b.offset))[0];
     selected.button.focus({preventScroll:true});
     outline.scrollTop+=selected.offset;
   }
 }
 async function navigate(direction,keyboard=false){
   if(navigating)return;
   navigating=true;
   try{
     if(preparing()){const id=neighbour(direction);if(id)await run("select",{id});}
     else if(direction==="previous"&&data.presentation.canPrevious)await run("previous");
     else {const id=neighbour(direction);if(id&&await run("select",{id}))await run("show");}
   }finally{if(keyboard)revealSelectedSlide();navigating=false;}
 }
 document.addEventListener("keydown",event=>{
   if(!data?.presentation||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest("input,textarea,select,[contenteditable],dialog,[role=dialog],[role=slider],[role=tablist],[role=combobox],#connections"))return;
   if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
   event.preventDefault();if(!event.repeat)void navigate(event.key==="ArrowLeft"?"previous":"next",true);
 });
 $("presentations-list").onclick=async()=>{
   $("presentations-list").disabled=true;
   try{
     const {files}=await call("library");
     $("presentation-choice").replaceChildren(...files.filter(f=>f.path.includes("/Presentations/")).map(f=>new Option(f.label.split("/").pop().replace(/\.md$/i,""),f.path)));
     $("presentation-choice").hidden=!$("presentation-choice").options.length;
     $("presentation-load").hidden=!$("presentation-choice").options.length;
     $("presentations-list").textContent="Refresh list";
     $("presentation-message").textContent=$("presentation-choice").options.length?"":"No presentations found.";
   }catch(e){$("presentation-message").textContent=e.message;}
   finally{$("presentations-list").disabled=false;}
 };
 $("presentation-load").onclick=async()=>{if(await run("load",{path:$("presentation-choice").value})){closePicker();name.focus({preventScroll:true});}};
 for(const [id,label,op] of [["question","Project question","poll-question"],["results","Project results","poll-results"]]){
   const button=document.createElement("button");button.id="graph-"+id;button.textContent=label;
   $("graph-close").after(button);button.onclick=()=>run(op);
 }
 const syncNotice=document.createElement("span");syncNotice.role="status";syncNotice.className="small muted";$("graph-status").after(syncNotice);
 for(const [id,op] of [["previous","previous"],["return","return"],["defaults","defaults"],["open","poll-open"],["close","poll-close"]])$("graph-"+id).onclick=()=>run(op);
 $("graph-next").onclick=()=>navigate("next");
 $("graph-previous").onclick=()=>navigate("previous");
 $("graph-build").onclick=()=>run("build",{model:$("model").value});
 return value=>{
   data=value;const p=data.presentation;syncNotice.textContent=data.audienceSync?.error||"";
   for(const id of ["question","results"])$("graph-"+id).hidden=p?.step.type!=="poll";
   if(document.body.classList.contains("presenting")!==!!data.live)(data.live?$("present-mode"):$("prepare-mode")).click();
   liveToggle.disabled=!p||liveChanging;syncLive();
   document.body.classList.toggle("using-presentation",!!p);panel.hidden=!p;
   name.textContent=p?.title||"Choose presentation";
   name.title=name.textContent;
   name.disabled=document.body.classList.contains("presenting")&&!!p;
   $("restart-presentation").disabled=!p;
   outline.hidden=!p;
   const key=JSON.stringify([p?.loadedAt,p?.outline]);
   if(key!==outlineKey){
   outlineKey=key;outline.replaceChildren();
   if(!p){snapshot="";return;}
   const detours=new Set(p.outline.flatMap(s=>s.related||[]));
   let chapter="";
   const addStep=(s,parent,target,label=s.title)=>{
     const b=document.createElement("button");b.className="outline-step";b.dataset.stepId=s.id;b.setAttribute("aria-current",s.id===p.current?"step":"false");
     if(parent){b.classList.add("outline-related");b.dataset.relatedTo=parent;b.title="Related slide";}
     const number=p.outline.findIndex(item=>item.id===s.id)+1;
     b.textContent=number+". "+label;b.setAttribute("aria-label","Slide "+number+": "+s.title+(parent?" — related slide":""));
     b.onclick=()=>selectSlide(s.id,parent);target.append(b);
   };
   for(const s of p.outline.filter(s=>!detours.has(s.id))){
     const group=s.chapter||"Narrative";
     if(group!==chapter){chapter=group;const h=document.createElement("h3");h.textContent=group;outline.append(h);}
     const row=document.createElement("div");row.className="outline-row";row.dataset.rowId=s.id;outline.append(row);
     addStep(s,null,row);
     const links=document.createElement("div");links.className="outline-links";row.append(links);
     let topic="";
     for(const id of s.related||[]){
       const related=p.outline.find(step=>step.id===id);if(!related)continue;
       const parts=related.title.split(" · ");
       const prefix=parts.length>1?parts.slice(0,-1).join(" · "):"";
       if(prefix&&prefix!==topic){const label=document.createElement("span");label.className="related-topic";label.textContent=prefix;links.append(label);topic=prefix;}
       addStep(related,s.id,links,parts.length>1?parts.at(-1):related.title);
     }
   }
   }
   if(!p)return;
   const parent=p.outline.find(s=>s.id===relatedParent&&(s.related||[]).includes(p.current))||p.outline.find(s=>(s.related||[]).includes(p.current));
   for(const row of outline.querySelectorAll(".outline-row")){
     const active=row.dataset.rowId===(parent?.id||p.current);
     row.querySelector(".outline-links").hidden=!active;
   }
   const shown=data.projection;
   const preview=preparing()||!shown?p.preview:shown;
   const kind=shown?.blank?"Blank":({question:"Question",results:"Results",material:"Slide",brief:"Build prompt",demo:"App",diagram:"Diagram"}[shown?.projectionKind]||"Slide");
   projectionStatus.textContent=preparing()?"Private preview · audience waiting":"On stage: "+kind;
   projectionStatus.title=shown?.title||"";
   for(const id of ["question","results"]){$("graph-"+id).disabled=!data.live;$("graph-"+id).setAttribute("aria-pressed",String(data.live&&shown?.projectionKind===id&&shown?.title===p.step.poll?.question));}
   applyTheme($("current-stage"),preparing()?p.theme:shown?.theme||p.theme);
   for(const button of outline.querySelectorAll("[data-step-id]"))button.setAttribute("aria-current",button.dataset.stepId===p.current?"step":"false");
   const nextPreview=JSON.stringify({...preview,build:undefined});
   if(nextPreview!==previewKey){previewKey=nextPreview;$("current-stage").classList.toggle("stage-blank-preview",!!preview.blank);$("current-stage").innerHTML=preview.blank?"<p>Stage is blank</p>":surface(preview);void renderDiagrams($("current-stage"));}
   if(snapshot!==p.loadedAt){snapshot=p.loadedAt;setDetailsMode();}
   if(data.codex.requests?.length)details.open=true;
   $("presentation-choice").title="Loaded: "+p.title+" · "+p.loadedAt;
   $("graph-label").textContent=p.step.chapter||"";
   $("graph-title").textContent=p.step.title;
   $("graph-title").classList.add("sr-only");
   $("graph-notes").textContent=p.step.notes||"";$("graph-notes").hidden=!p.step.notes;
   $("graph-prompt").hidden=p.step.type!=="build";$("graph-prompt").textContent=p.resolved.prompt;
   $("graph-next").textContent="Next →";$("graph-next").disabled=!neighbour("next");
   $("graph-previous").textContent="← Previous";
   $("graph-previous").disabled=!neighbour("previous")&&(preparing()||!p.canPrevious);$("graph-return").hidden=preparing()||!p.canReturn;
   $("graph-defaults").hidden=!p.resolved.missing.length;
   $("graph-build").hidden=p.step.type!=="build";
   $("graph-build").disabled=p.resolved.missing.length>0||data.codex.status!=="ready"||p.runs.some(r=>r.step===p.current);
   for(const id of ["open","close"]){$("graph-"+id).hidden=p.step.type!=="poll";$("graph-"+id).disabled=!data.graphPoll?.configured||!!data.graphPoll?.frozen||(id==="open"&&!data.live);}
 };
}
