import test from "node:test";
import assert from "node:assert/strict";
import {fixture} from "./fixture.ts";

test("malformed JSON commands cannot start builds or change lecture state", async (t) => {
 const {studio,address,bridge}=await fixture();
 t.after(()=>studio.server.close());
 const before=studio.snapshot();
 const cases:[string,unknown][]=[
  ["draft",null], ["draft",[]], ["act",{act:{id:"agents"}}],
  ["codex/start",{brief:"Reviewed prompt",model:true}],
  ["codex/answer",{id:{},decision:"accept"}],
  ["codex/answer",{id:1,decision:"accept",answers:{question:42}}],
 ];
 for(const [path,body] of cases){
  const response=await fetch(address.origin+"/api/"+path,{method:"POST",headers:{origin:address.origin,authorization:"Bearer "+address.deskToken,"content-type":"application/json"},body:JSON.stringify(body)});
  assert.equal(response.status,400,path);
  await response.body?.cancel();
 }
 assert.equal(bridge.lastPrompt,undefined);
 assert.deepEqual(studio.snapshot().draft,before.draft);
 assert.equal(studio.snapshot().activeAct,before.activeAct);
});
