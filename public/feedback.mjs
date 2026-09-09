import {escape} from "./shared.mjs";
export function mountFeedback({call,update}){
 const menu=document.createElement("details");menu.id="feedback-menu";
 menu.innerHTML='<summary>Responses</summary><section class="feedback-panel"><div class="button-row"><label>Collect <select id="feedback-mode"><option value="questions">Questions</option><option value="words">Word cloud</option></select></label></div><label>Prompt <input id="feedback-prompt" maxlength="200" value="What would you like to ask?"></label><div class="button-row"><button id="feedback-start">Open new collection</button><button id="feedback-close">Close collection</button></div><p id="feedback-state"></p><div class="button-row"><button id="feedback-show">Show approved cloud</button><button id="feedback-return">Back to slide</button></div><p id="feedback-error" role="status"></p><div id="feedback-items"></div></section>';
 document.querySelector(".top-actions").prepend(menu);
 const $=id=>document.getElementById(id);let snapshot=null,busy=false,listKey="",revision=0;
 $("feedback-mode").onchange=()=>{$("feedback-prompt").value=$("feedback-mode").value==="words"?"Which words come to mind?":"What would you like to ask?";};
 const render=value=>{
   snapshot=value;const {config,items=[]}=value;
   menu.querySelector("summary").textContent="Responses · "+items.filter(x=>x.status==="pending").length;
   $("feedback-state").textContent=config?(config.open?"Open":"Closed")+" · "+config.prompt:"Collection closed";
   $("feedback-show").hidden=config?.mode!=="words";
   const next=JSON.stringify(items);if(next===listKey)return;listKey=next;
   $("feedback-items").innerHTML=items.filter(x=>x.status!=="done").map(x=>'<div class="feedback-item"><p>'+escape(x.text)+'</p><div class="button-row">'+(config?.mode==="words"?'<button data-action="approve" data-id="'+escape(x.id)+'" '+(x.status==="approved"?"disabled":"")+'> '+(x.status==="approved"?"Approved":"Approve")+'</button>':'<button data-action="show-question" data-id="'+escape(x.id)+'">Discuss</button>')+'<button data-action="done" data-id="'+escape(x.id)+'">Done</button></div></div>').join("")||"<p>No responses.</p>";
 };
 const act=async(action,id)=>{
   if(busy)return;
   if(action==="start"&&snapshot?.items?.length&&!confirm("Start a new collection? Current responses will be removed."))return;
   busy=true;revision++;
   try{
     const result=await call("feedback",{action,id,mode:$("feedback-mode").value,prompt:$("feedback-prompt").value});
     if(["return","show-question","show-cloud"].includes(action))update(result);else render(result);
     $("feedback-error").textContent="";
   }catch(e){$("feedback-error").textContent=e.message;}finally{busy=false;}
 };
 for(const [id,action] of [["start","start"],["close","close"],["show","show-cloud"],["return","return"]])$("feedback-"+id).onclick=()=>void act(action);
 $("feedback-items").onclick=e=>{const button=e.target.closest("button[data-action]");if(button)void act(button.dataset.action,button.dataset.id);};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu.open){menu.open=false;menu.querySelector("summary").focus();}});
 document.addEventListener("click",e=>{if(!menu.contains(e.target))menu.open=false;});
 async function refresh(){
   try{if(!busy){const started=revision;const value=await call("feedback");if(!busy&&revision===started)render(value);}}
   catch(e){if(menu.open)$("feedback-error").textContent=e.message;}
   finally{setTimeout(refresh,5000);}
 }
 void refresh();
}
