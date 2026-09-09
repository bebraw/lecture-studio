import test from "node:test";
import assert from "node:assert/strict";
import {audienceStage,AudienceStageSync} from "../lib/audience-stage.mjs";
test("audience publication omits private fields and explains local demos",()=>{
 const stage=audienceStage({title:"Demo",mode:"demo",demoUrl:"http://localhost:5173/",brief:"PRIVATE",notes:"PRIVATE",codex:{messages:["PRIVATE"]},workspace:"PRIVATE"});
 assert.equal(stage.mode,"material");assert.equal(stage.demoUrl,"");
 assert.doesNotMatch(JSON.stringify(stage),/PRIVATE|localhost/);
 assert.equal(audienceStage({mode:"demo",demoUrl:"https://example.com/"}).mode,"demo");
});
test("audience sync serializes writes and coalesces intermediate slides",async()=>{
 const sent=[],releases=[];
 const sync=new AudienceStageSync({origin:"https://audience.invalid",token:"test",fetcher:async(_url,options)=>{sent.push(JSON.parse(options.body));await new Promise(resolve=>releases.push(resolve));return new Response(null,{status:204});}});
 sync.publish({title:"One"});sync.publish({title:"Two"});sync.publish({title:"Three"});
 assert.equal(sent.length,1);releases.shift()();
 try{await assert.doesNotReject(async()=>{
   const deadline=Date.now()+2000;
   while(sent.length<2&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
   assert.equal(sent.length,2);assert.equal(sent[1].title,"Three");
 });}finally{releases.shift()?.();sync.close();}
});
