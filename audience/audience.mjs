import {surface,applyTheme,renderDiagrams,buildLabel,escape} from "./shared.mjs";
const main=document.querySelector("#stage-content"),notice=document.querySelector("#stage-connection");
let key="",submitting=false,voteError="";
async function refresh(){
 try{
   const response=await fetch("/api/audience",{cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error();
   const {stage,poll}=await response.json();
   const next=poll?"poll:"+poll.id:JSON.stringify(stage&&{...stage,build:undefined});
   if(!submitting&&next!==key){
     key=next;applyTheme(document.body,stage?.theme);
     document.body.classList.toggle("blank",!poll&&!!stage?.blank);
     main.dataset.mode=poll?"poll":stage?.mode||"material";
     main.innerHTML=poll?"<h1>"+escape(poll.question)+"</h1>"+poll.html:stage?surface(stage):"<h1>Waiting for the lecturer</h1>";
     document.querySelector("#era").textContent=poll?"VOTE":stage?.act?.replaceAll("-"," ").toUpperCase()||"";
     document.querySelector("#source-credit").textContent=poll?"Voting stays open until the lecturer closes it.":stage?.source||"";
     void renderDiagrams(main);
   }
   document.querySelector("#build-signal").textContent=stage?.build?.startedAt?buildLabel(stage.build):"";
   notice.textContent=voteError;
 }catch{notice.textContent="Connection lost · holding the last view";}
}
main.addEventListener("submit",async event=>{
 event.preventDefault();if(submitting)return;
 const form=event.target,button=form.querySelector("button");submitting=true;button.disabled=true;
 try{
   const response=await fetch(form.action,{method:"POST",body:new URLSearchParams(new FormData(form)),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error();
   voteError="";button.textContent="Vote saved · change vote";
 }catch{voteError="Vote not confirmed. Try again.";notice.textContent=voteError;}
 finally{submitting=false;button.disabled=false;}
});
async function tick(){await refresh();setTimeout(tick,1500);}void tick();
