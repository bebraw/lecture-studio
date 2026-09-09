import {surface,applyTheme,renderDiagrams,buildLabel,escape} from "./shared.mjs";
const main=document.querySelector("#stage-content"),notice=document.querySelector("#stage-connection");
let key="",submitting=false,voteError="";
const feedback=document.createElement("details");
feedback.id="student-feedback";feedback.hidden=true;
feedback.innerHTML='<summary>Send a response</summary><form><label id="feedback-label" for="feedback-text"></label><textarea id="feedback-text" required maxlength="400"></textarea><p>Private to the lecturer unless selected for discussion. No names or sensitive information. Responses expire after 24 hours.</p><button>Send privately</button><p id="feedback-notice" role="status"></p></form>';
document.querySelector(".stage-bottom").before(feedback);
let feedbackConfig=null,feedbackBusy=false;
async function refreshFeedback(){
 try{
   const response=await fetch("/api/feedback",{cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error();
   const config=await response.json();
   if(config?.round!==feedbackConfig?.round){feedback.querySelector("form").reset();feedback.querySelector("#feedback-notice").textContent="";}
   feedbackConfig=config;feedback.hidden=!config?.open;
   if(config?.open){
     feedback.querySelector("summary").textContent=config.mode==="words"?"Add words":"Ask a question";
     feedback.querySelector("#feedback-label").textContent=config.prompt;
     feedback.querySelector("textarea").maxLength=config.mode==="words"?32:400;
   }
 }catch{feedback.hidden=true;}
 finally{setTimeout(refreshFeedback,3000);}
}
feedback.querySelector("form").onsubmit=async event=>{
 event.preventDefault();if(feedbackBusy||!feedbackConfig?.open)return;
 feedbackBusy=true;const button=feedback.querySelector("button");button.disabled=true;
 try{
   const response=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({round:feedbackConfig.round,text:feedback.querySelector("textarea").value}),signal:AbortSignal.timeout(8000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Not confirmed");
   feedback.querySelector("textarea").value="";
   feedback.querySelector("#feedback-notice").textContent="Sent privately. The lecturer chooses what to show.";
 }catch(e){feedback.querySelector("#feedback-notice").textContent=e.message;}
 finally{feedbackBusy=false;button.disabled=false;}
};
void refreshFeedback();
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
