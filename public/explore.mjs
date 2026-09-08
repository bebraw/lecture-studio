import {escape,renderDiagrams} from "./shared.mjs";
const defaults={
 opening:[["Early web","Concepts/01 Web as hypermedia.md","Stage block"],["Client / server","?server"],["URLs and HTTP","?HTTP"],["What is prebuilt?","Demo/Project start plan.md"]],
 document:[["Hypermedia","Concepts/01 Web as hypermedia.md","Stage block"],["First browser","Visuals/WorldWideWeb browser.md"],["Servers","?server"],["Forms","Concepts/02 Forms make the web writable.md","Stage block"]],
 forms:[["Progressive enhancement","Concepts/03 Progressive enhancement.md","Stage block"],["Layers","Concepts/03 Progressive enhancement.md","Visual"],["Accessibility","?accessibility"]],
 application:[["Browser runtime","Concepts/04 Browser as application runtime.md","Stage block"],["Hidden state","Concepts/05 What client-heavy applications can hide.md","Stage block"],["Shared state","?state"]],
 agents:[["Two directions","Concepts/06 Two agentic directions.md","Stage block"],["Affordances","Concepts/07 Affordances for people and agents.md","Stage block"],["References","References/Source register.md"]],
 context:[["Privacy and receipts","Concepts/08 Context, privacy, and receipts.md","Stage block"],["Personal context","?context"],["Profiling","?profiling"]],
 synthesis:[["Synthesis","Concepts/09 Synthesis.md","Stage block"],["Questions","Interactions/Question bank.md"],["Next action","Demo/SDLCAI bridge.md"]]
};
export function mountExplorer({host,call,onShow,getScope}) {
 const panel=document.createElement("section");panel.className="explorer";
 panel.innerHTML='<div class="section-heading"><h2>Explore this idea</h2><span id="explore-cue" class="small muted"></span></div><div id="explore-shortcuts" class="button-row"></div><form id="explore-search-form" class="search-row"><label class="search-field"><span class="sr-only">Search lecture notes</span><input id="explore-query" type="search" placeholder="Search an idea in the lecture notes…" minlength="2" maxlength="120" required></label><button>Search</button></form><p id="explore-status" class="small muted" role="status">Read privately. Show only when useful.</p><div id="explore-results"></div><section id="explore-selection" hidden><h3 id="explore-title"></h3><label>Note section<select id="explore-sections"></select></label><div id="explore-excerpt"></div><p id="explore-source" class="small muted"></p><button id="explore-show" class="primary">Show this excerpt →</button></section><details class="explore-prepare"><summary>Customize shortcuts for this cue</summary><p class="small">One per line: Label | relative note path | optional section. Use ?server instead of a path for a search shortcut. Saved in this browser only.</p><textarea id="explore-mappings" rows="4"></textarea><div class="button-row"><button id="explore-save">Save shortcuts</button><button id="explore-defaults">Restore defaults</button></div></details>';
 host.append(panel);
 const $=id=>panel.querySelector("#"+id);
 let cue,notes=[],note,section,request=0,searchRequest=0,custom={};
 try{custom=JSON.parse(localStorage.getItem("lecture-explore-shortcuts")||"{}");}catch{}
 if(!custom || typeof custom!=="object" || Array.isArray(custom))custom={};
 const status=text=>$("explore-status").textContent=text;
 function mappings(){const value=custom[cue?.id]||defaults[cue?.id]||[];return Array.isArray(value)?value.slice(0,6):[];}
 async function read(path,heading){
   const id=++request;status("Reading lecture note…");$("explore-show").disabled=true;
   try{
     if(!notes.length)notes=(await call("library")).files;
     if(!notes.some(n=>n.path===path))throw new Error("That note is not in the lecture folder. Search or update this shortcut.");
     const result=await call("note?path="+encodeURIComponent(path));
     if(id!==request)return;
     note=result;$("explore-title").textContent=note.title;
     $("explore-sections").innerHTML=note.sections.map((s,i)=>'<option value="'+i+'">'+escape(s.heading)+'</option>').join("");
     const preferred=note.sections.findIndex(s=>s.heading===(heading||"Stage block"));
     $("explore-sections").value=String(Math.max(0,preferred));
     select();$("explore-selection").hidden=false;status("Private excerpt · nothing projected or sent.");
   }catch(e){if(id===request)status(e.message);}
   finally{if(id===request)$("explore-show").disabled=!section;}
 }
 function select(){
   section=note.sections[Number($("explore-sections").value)];
   $("explore-excerpt").innerHTML=section.html;void renderDiagrams($("explore-excerpt"));
   $("explore-source").textContent=note.path+" · "+section.heading;
 }
 async function search(query){
   const id=++searchRequest;status("Searching lecture notes… First search builds a read-only index.");
   try{
     if(!notes.length)notes=(await call("library")).files;
     const data=await call("search?q="+encodeURIComponent(query));
     if(id!==searchRequest)return;
     $("explore-results").replaceChildren();
     for(const match of data.matches){
       const button=document.createElement("button");button.className="explore-result";
       const title=document.createElement("strong");title.textContent=match.title+" · "+match.section;
       const snippet=document.createElement("span");snippet.textContent=match.snippet;
       button.append(title,snippet);button.onclick=()=>read(match.path,match.section);$("explore-results").append(button);
     }
     status(data.matches.length+" matching sections"+(data.unavailable?" · "+data.unavailable+" notes unavailable":"")+". Select one to read privately.");
   }catch(e){if(id===searchRequest)status(e.message);}
 }
 function draw(){
   $("explore-cue").textContent=cue.title;
   $("explore-shortcuts").replaceChildren();
   for(const item of mappings()){
     if(!Array.isArray(item)||typeof item[0]!=="string"||typeof item[1]!=="string")continue;
     const [label,target,heading]=item;const button=document.createElement("button");button.textContent=label;
     button.onclick=()=>{if(target.startsWith("?")){$("explore-query").value=target.slice(1);void search(target.slice(1));}else void read(getScope()+"/"+target,heading);};
     $("explore-shortcuts").append(button);
   }
   $("explore-mappings").value=mappings().map(m=>m.join(" | ")).join("\n");
 }
 $("explore-search-form").onsubmit=e=>{e.preventDefault();void search($("explore-query").value);};
 $("explore-sections").onchange=select;
 $("explore-show").onclick=async()=>{
   if(!note||!section)return;
   $("explore-show").disabled=true;
   try{await onShow({title:note.title,body:section.body,source:note.path+" · "+section.heading});status("Excerpt shown to the room. No coding prompt sent.");}
   catch(e){status(e.message);}
   finally{$("explore-show").disabled=false;}
 };
 $("explore-save").onclick=()=>{
   try{
     const rows=$("explore-mappings").value.split("\n").filter(l=>l.trim()).map(l=>l.split("|").map(s=>s.trim()));
     if(rows.length>6 || rows.some(m=>m.length<2||m.length>3||!m[0]||!m[1]||m[0].length>60||m[1].length>200||m[1].startsWith("/")||m[1].includes("..")||m[1].includes("\\")))throw new Error("Use up to six labeled shortcuts inside the lecture folder.");
     custom[cue.id]=rows;localStorage.setItem("lecture-explore-shortcuts",JSON.stringify(custom));draw();status("Shortcuts saved for this cue.");
   }catch(e){status(e.message);}
 };
 $("explore-defaults").onclick=()=>{delete custom[cue.id];localStorage.setItem("lecture-explore-shortcuts",JSON.stringify(custom));draw();};
 return {setCue(next){if(cue?.id===next.id)return;cue=next;draw();}};
}
