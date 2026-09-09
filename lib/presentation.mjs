import {validatePoll} from "./audience-poll.mjs";
import {publicStage} from "./material.mjs";
import {initialDraft} from "./narrative.mjs";
export const defaultTheme={background:"#ffffff",text:"#202020",muted:"#616161",accent:"#e6e6e6",headingFont:"Georgia, serif",bodyFont:"Arial, sans-serif",codeFont:"Menlo, monospace"};
export function parseTheme(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Invalid presentation theme");
 const theme={...defaultTheme};
 for(const [key,value] of Object.entries(input)){
   if(!(key in defaultTheme)||typeof value!=="string"||!(key.endsWith("Font")?/^[a-zA-Z0-9 ,'-]{1,150}$/:/^#[0-9a-fA-F]{6}$/).test(value))throw new Error("Invalid theme "+key);
   theme[key]=value;
 }
 return theme;
}
export function parsePresentation(note){
 const raw=note.sections.find(s=>s.heading==="Presentation")?.body;
 const value=JSON.parse(raw?.match(/^\s*```json\s*\n([\s\S]*?)\n```\s*$/)?.[1]||"null");
 const text=(v,n)=>typeof v==="string"&&v.length<=n;
 if(!value||value.version!==1||!text(value.title,200)||!Array.isArray(value.steps)||!value.steps.length||value.steps.length>100)throw new Error("Invalid presentation v1");
 const ids=new Set();
 value.theme=parseTheme(value.theme);
 for(const s of value.steps){
   if(!/^[a-z0-9-]{1,60}$/.test(s.id)||ids.has(s.id)||!text(s.title,200)||!text(s.body||"",16000)||!text(s.notes||"",4000)||!["title","question","material","build","poll"].includes(s.type))throw new Error("Invalid or duplicate presentation step");
   ids.add(s.id);
   if(s.chapter!==undefined&&!text(s.chapter,100))throw new Error("Invalid chapter");
   if(!text(s.source||"",500)||((s.uses||[]).length>10))throw new Error("Presentation source or dependencies too large");
   if(s.type==="poll"){s.poll=validatePoll(s.poll);if(!/^[a-z0-9-]{1,80}$/.test(s.room))throw new Error("Poll requires a prepared room ID");}
 }
 if(!ids.has(value.start))throw new Error("Missing start step");
 for(const s of value.steps){
   if(s.next&&!ids.has(s.next))throw new Error("Missing next step");
   if(s.related&&!Array.isArray(s.related))throw new Error("Invalid detours");
   for(const id of s.related||[])if(!ids.has(id))throw new Error("Missing detour");
   if(s.uses&&!Array.isArray(s.uses))throw new Error("Invalid build dependencies");
   for(const dep of s.uses||[]){
     const p=value.steps.find(x=>x.id===dep.poll&&x.type==="poll");
     if(!p||!dep.instructions||p.poll.options.some(o=>!text(dep.instructions[o.id],2000)))throw new Error("Each poll option needs an implementation instruction");
   }
 }
 return structuredClone(value);
}
export class PresentationSession{
 constructor(definition,path){this.definition=definition;this.path=path;this.current=definition.start;this.history=[];this.returns=[];this.decisions={};this.runs=[];this.defaults=new Set();this.loadedAt=new Date().toISOString();}
 step(){return this.definition.steps.find(s=>s.id===this.current);}
 move(action,id){
   const s=this.step();
   if(action==="select"){if(!this.definition.steps.some(x=>x.id===id))throw new Error("Unknown step");this.current=id;this.history=[];this.returns=[];return;}
   if(action==="return"){const target=this.returns.pop();if(target){this.current=target.id;this.history.length=target.depth;}return;}
   if(action==="previous"){this.current=this.history.pop()||this.current;return;}
   const target=action==="detour"?id:s.next;
   if(action==="detour"&&!(s.related||[]).includes(id))throw new Error("Choose a linked detour");
   if(target){if(action==="detour")this.returns.push({id:this.current,depth:this.history.length});this.history.push(this.current);this.current=target;}
 }
 resolve(){
   const s=this.step();const missing=[];const inputs=[];
   const additions=(s.uses||[]).map(dep=>{
     const p=this.definition.steps.find(x=>x.id===dep.poll);
     const frozen=this.decisions[dep.poll];
     if(!frozen&&!this.defaults.has(s.id)){missing.push(dep.poll);return p.title+": decision required";}
     const selected=frozen?.winner.id||p.poll.defaultId;
     inputs.push({poll:dep.poll,selected,default:!frozen,revision:frozen?.revision||null});
     return p.title+": "+dep.instructions[selected]+"\n"+(frozen?"Frozen audience choice: "+frozen.winner.label:"Explicitly accepted prepared default: "+selected);
   });
   return {prompt:[s.body||"",...additions].join("\n\n"),missing,inputs};
 }
state(){return {theme:this.definition.theme,preview:publicStage({...initialDraft(),mode:this.step().type==='build'?'brief':'material',title:this.step().title,body:this.step().type==='build'?this.resolve().prompt:(this.step().body||'')+(this.step().type==='poll'?'\n\n'+this.step().poll.options.map(o=>o.label).join('\n\n'):''),source:this.step().source||''},this.loadedAt+'-'+this.current),outline:this.definition.steps.map(({id,title,type,chapter,next,related})=>({id,title,type,chapter,next,related})),title:this.definition.title,path:this.path,loadedAt:this.loadedAt,current:this.current,step:this.step(),related:(this.step().related||[]).map(id=>this.definition.steps.find(s=>s.id===id)),canReturn:!!this.returns.length,canPrevious:!!this.history.length,resolved:this.resolve(),runs:this.runs};}
}
