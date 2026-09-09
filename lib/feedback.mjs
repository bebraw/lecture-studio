const escape=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function feedbackRequest(poll,body){
 if(!poll.origin||!poll.token)throw new Error("Connect an audience service first");
 const response=await poll.fetcher(poll.origin+"/presenter/feedback",{method:body?"POST":"GET",headers:{authorization:"Bearer "+poll.token,"content-type":"application/json"},body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(8000)});
 if(response.status===404){await response.body?.cancel();throw new Error("Deploy the updated audience Worker to enable responses");}
 const reader=response.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw new Error("Feedback response too large");}chunks.push(value);}
 const result=JSON.parse(Buffer.concat(chunks).toString());
 if(!response.ok)throw new Error(result.error||"Feedback service unavailable");
 return result;
}
export function feedbackSlide(snapshot,id){
 if(id){
   const item=snapshot.items.find(item=>item.id===id&&item.status!=="done");
   if(snapshot.config?.mode!=="questions"||!item)throw new Error("Choose a pending question");
   return {mode:"question",title:item.text,html:"",source:"Audience question · selected by the lecturer"};
 }
 if(snapshot.config?.mode!=="words")throw new Error("Start a word collection first");
 const counts=new Map();
 for(const item of snapshot.items.filter(item=>item.status==="approved")){
   const term=item.text.toLocaleLowerCase("en").trim();
   counts.set(term,(counts.get(term)||0)+1);
 }
 const words=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,40);
 if(!words.length)throw new Error("Approve some words first");
 const max=words[0][1];
 return {mode:"material",title:snapshot.config.prompt,html:'<div class="word-cloud" role="list" aria-label="Approved audience words">'+words.map(([word,n])=>'<span role="listitem" class="word-size-'+Math.min(4,Math.ceil(n/max*4))+'">'+escape(word)+'<small> ×'+n+'</small></span>').join("")+"</div>",source:"Approved responses only · frozen when shown"};
}
