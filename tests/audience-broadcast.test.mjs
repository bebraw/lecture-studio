import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./fixture.mjs";
import {AudiencePoll,themePoll} from "../lib/audience-poll.mjs";
test("only published slides sync; polling never replaces another projected slide",async()=>{
 const writes=[];let status="locked",revision=1;
 const poll=new AudiencePoll({origin:"https://audience.invalid",token:"private",fetcher:async(url,init)=>{
   if(url.endsWith("/presenter/stage")){writes.push(JSON.parse(init.body));return new Response(null,{status:204});}
   if(url.endsWith("/open"))status="open";
   if(url.endsWith("/lock"))status="locked";
   return Response.json({status,revision:revision++,totalVotes:0,choices:themePoll().options.map(o=>({...o,votes:0}))});
 }});
 const path="Lectures/Web Development 2026/Presentations/Test.md";
 const definition={version:1,title:"Test",start:"title",steps:[{id:"title",type:"title",title:"Public title",notes:"PRIVATE",next:"vote"},{id:"vote",type:"poll",title:"Theme",room:"webdev-2026",poll:themePoll()}]};
 const library={status:"Fixture",list:async()=>[{path}],read:async()=>({sections:[{heading:"Presentation",body:"\x60\x60\x60json\n"+JSON.stringify(definition)+"\n\x60\x60\x60"}]}),close:async()=>{}};
 const {studio,address}=await fixture({poll,library});
 const call=async(op,body={})=>{const response=await fetch(address.origin+"/api/presentation/"+op,{method:"POST",headers:{origin:address.origin,authorization:"Bearer "+address.deskToken,"content-type":"application/json"},body:JSON.stringify(body)});const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
 const wait=()=>new Promise(resolve=>setTimeout(resolve,1100));
 try{
   await call("load",{path});await wait();assert.equal(writes.length,0);
   await call("show");await wait();assert.equal(writes.at(-1).title,"Public title");
   await call("select",{id:"vote"});await call("poll-open");await wait();
   assert.equal(writes.at(-1).title,"Public title");
   await call("poll-refresh");await wait();assert.equal(writes.at(-1).title,"Public title");
   await call("poll-question");await wait();assert.match(writes.at(-1).html,/Editorial/);assert.doesNotMatch(writes.at(-1).html,/Editorial: 0/);
   await call("poll-results");await wait();assert.match(writes.at(-1).html,/Editorial: 0/);
   await call("poll-close");assert.doesNotMatch(JSON.stringify(writes),/PRIVATE|private-output|workspace/);
 }finally{await new Promise(resolve=>studio.server.close(resolve));}
});
