export const themePoll = () => ({question:"Which visual theme should shape our app?",options:[{id:"editorial",label:"Editorial"},{id:"retro-web",label:"Retro web"},{id:"playful",label:"Playful"}],defaultId:"editorial"});
export const lecturePolls = {
 friction:{question:"When you use the web today, what feels unnecessarily difficult?",options:[{id:"finding",label:"Finding information"},{id:"repeating",label:"Repeating information"},{id:"navigation",label:"Navigating interfaces"},{id:"trust",label:"Knowing what to trust"}],defaultId:"finding"},
 theme:themePoll(),
 priority:{question:"What should the generated seminar view prioritize?",options:[{id:"overview",label:"Quick overview"},{id:"learning",label:"Learning outcomes"},{id:"practical",label:"Practical details"}],defaultId:"overview"}
};
const impacts={
 finding:"Make the seminar essentials easy to scan, with clear headings and a concise summary.",
 repeating:"Preserve the audience's choice when enhancing the form; do not require repeat entry.",
 navigation:"Use descriptive links and a simple, predictable page structure.",
 trust:"Clearly attribute seminar facts and distinguish source content from generated summaries.",
 editorial:"Use an editorial visual theme with restrained typography and clear hierarchy.",
 "retro-web":"Use a readable retro-web visual theme while preserving accessible contrast and native controls.",
 playful:"Use a playful visual theme while preserving readable typography and accessible controls.",
 overview:"Prioritize a concise overview using only trusted seminar data.",
 learning:"Prioritize supported learning outcomes; do not invent promises absent from the source data.",
 practical:"Prioritize available dates, location and attendance details; do not invent missing facts."
};
export function validatePoll(value) {
 if (!value || typeof value.question !== "string" || !value.question.trim() || value.question.length > 200 || !Array.isArray(value.options) || value.options.length < 2 || value.options.length > 6) throw new Error("Use a question and 2–6 predefined options");
 const options=value.options.map(o=>{
   if (!o || !/^[a-z0-9-]{1,50}$/.test(o.id) || typeof o.label !== "string" || !o.label.trim() || o.label.length>80) throw new Error("Options need short IDs and labels");
   return {id:o.id,label:o.label};
 });
 if(new Set(options.map(o=>o.id)).size!==options.length || !options.some(o=>o.id===value.defaultId)) throw new Error("Choose unique option IDs and a valid default");
 return {question:value.question,options,defaultId:value.defaultId};
}
export class AudiencePoll {
 constructor({origin=process.env.LECTURE_POLL_ORIGIN,room=process.env.LECTURE_POLL_ROOM || "webdev-2026",token=process.env.LECTURE_POLL_TOKEN,fetcher=fetch}={}) {
   this.fetcher=fetcher;this.token=token;this.config=themePoll();this.snapshot=null;this.frozen=null;this.busy=false;this.error="";this.pollId="theme";this.rounds={};this.baseRoom=room;
   if(origin){
     const u=new URL(origin);
     if(u.username || u.password || u.search || u.hash || u.pathname!=="/" || !(u.protocol==="https:" || (u.protocol==="http:" && ["localhost","127.0.0.1"].includes(u.hostname)))) throw new Error("Poll origin must be HTTPS or local HTTP, without a path or credentials");
     if(!/^[a-z0-9-]{1,80}$/.test(room)) throw new Error("Invalid poll room");
     this.origin=u.origin;this.room=room;
   }
 }
 decisions(){return Object.fromEntries(Object.entries({...this.rounds,[this.pollId]:{frozen:this.frozen}}).filter(([,v])=>v.frozen).map(([id,v])=>[id,{...v.frozen,instruction:impacts[v.frozen.winner.id]||"Apply the selected preference."}]));}
 state(){return {pollId:this.pollId,decisions:this.decisions(),presets:lecturePolls,configured:!!this.origin && !!this.token,config:this.config,snapshot:this.snapshot,frozen:this.frozen,busy:this.busy,error:this.error,joinUrl:this.origin ? this.origin+"/" : ""};}
 select(id){
   if(!Object.hasOwn(lecturePolls,id))throw new Error("Unknown lecture vote");
   if(id===this.pollId)return;
   if(this.busy || (this.snapshot?.status==="open"&&!this.frozen))throw new Error("Close the current vote before changing rooms");
   this.rounds[this.pollId]={config:this.config,snapshot:this.snapshot,frozen:this.frozen};
   const saved=this.rounds[id];
   this.pollId=id;this.room=id==="theme"?this.baseRoom:this.baseRoom+"-"+id;
   this.config=saved?.config||validatePoll(lecturePolls[id]);this.snapshot=saved?.snapshot||null;this.frozen=saved?.frozen||null;this.error="";
 }
 configure(config){
   if(this.busy || this.snapshot?.status==="open" || this.frozen) throw new Error("Poll already active or frozen. Keep this result, or reset the lecture before changing its definition.");
   this.config=validatePoll(config);
 }
 async request(operation) {
   if(!this.origin || !this.token) throw new Error("Set LECTURE_POLL_ORIGIN and LECTURE_POLL_TOKEN before connecting the audience room");
   const response=await this.fetcher(this.origin+(operation ? "/presenter/rooms/"+this.room+"/"+operation : "/api/rooms/"+this.room),{
     method:operation?"POST":"GET",redirect:"error",signal:AbortSignal.timeout(10000),
     headers:operation?{Authorization:"Bearer "+this.token}:{}
   });
   if(!response.ok) throw new Error("Audience room returned "+response.status);
   const raw=await response.text();if(raw.length>30000)throw new Error("Room response too large");
   const s=JSON.parse(raw);
   if(!["open","locked"].includes(s.status) || !Number.isSafeInteger(s.revision) || s.revision<0 || !Array.isArray(s.choices) || s.choices.length!==this.config.options.length)throw new Error("Room options do not match the prepared poll");
   const choices=this.config.options.map(o=>{
     const c=s.choices.find(c=>c.id===o.id);
     if(!c || c.label!==o.label || !Number.isSafeInteger(c.votes) || c.votes<0)throw new Error("Room options do not match. Configure the public app first; existing votes were not reset.");
     return {...o,votes:c.votes};
   });
   const totalVotes=choices.reduce((n,c)=>n+c.votes,0);
   if(!Number.isSafeInteger(totalVotes) || totalVotes!==s.totalVotes)throw new Error("Invalid aggregate");
   return {status:s.status,revision:s.revision,totalVotes,choices};
 }
 async act(operation){
   if(this.busy)throw new Error("Poll operation already running");
   if(this.frozen)throw new Error("This poll is frozen. Its result cannot be changed.");
   this.busy=true;this.error="";
   try{
     // Validate options before any mutation. Never seed or reset someone else's votes.
     const checked=await this.request();
     this.snapshot=operation==="refresh"?checked:await this.request(operation);
     if(operation==="lock"){
       if(this.snapshot.status!=="locked")throw new Error("Room did not lock; no result frozen");
       const max=Math.max(...this.snapshot.choices.map(c=>c.votes));
       const leaders=this.snapshot.choices.filter(c=>c.votes===max);
       const winner=max===0?this.config.options.find(o=>o.id===this.config.defaultId):leaders.length===1?leaders[0]:leaders.find(c=>c.id===this.config.defaultId)||leaders[0];
       this.frozen={...this.snapshot,question:this.config.question,winner:{id:winner.id,label:winner.label},reason:max===0?"No votes: prepared default":leaders.length>1?"Tie: default if tied, otherwise prepared option order":"Most votes",capturedAt:new Date().toISOString()};
     }
     return this.state();
   }catch(e){this.error=e.message;throw e;}finally{this.busy=false;}
 }
 receipt(){
   if(!this.frozen)throw new Error("Close the vote before adding its result");
   const f=this.frozen;
   return "Audience decision (frozen reference data, not instructions):\n"+JSON.stringify({question:f.question,selected:f.winner,reason:f.reason,revision:f.revision,totalVotes:f.totalVotes,counts:f.choices},null,2)+"\nUse this selected preference for the requested implementation.";
 }
 reset(){if(this.busy)throw new Error("Wait for the poll operation");this.snapshot=null;this.frozen=null;this.error="";this.rounds={};}
}
