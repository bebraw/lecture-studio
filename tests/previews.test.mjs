import test from "node:test";
import assert from "node:assert/strict";
import { previewCandidates } from "../public/shared.mjs";
import { fixture } from "./fixture.mjs";

test("preview detection filters docs, credentials, API endpoints and studio aliases", () => {
 const urls = previewCandidates([{text: "Preview: [app](http://localhost:8799/rooms/demo). http://localhost:8799/rooms/demo https://docs.example.com http://localhost:4317/desk http://user:pass@localhost:8799/ http://localhost:8799/?token=secret http://localhost:8799/api/votes"}], "http://127.0.0.1:4317");
 assert.deepEqual(urls, ["http://localhost:8799/rooms/demo"]);
});
test("preview handoff preserves published material and an unrelated private draft", async t => {
 const {studio,address}=await fixture(); t.after(()=>studio.server.close());
 const call=async(path,body,token=address.deskToken)=>{
   const res=await fetch(address.origin+"/api/"+path,{method:"POST",headers:{Origin:address.origin,Authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(body)});
   return {status:res.status,data:await res.json()};
 };
 const first=await (await fetch(address.origin+"/api/desk",{headers:{Authorization:"Bearer "+address.deskToken}})).json();
 await call("draft",{...first.draft,title:"Private unsent draft"});
 assert.equal((await call("show-preview",{url:"http://localhost:8799/"},address.stageToken)).status,401);
 const shown=(await call("show-preview",{url:"http://localhost:8799/"})).data;
 assert.equal(shown.stage.mode,"demo");assert.equal(shown.draft.title,"Private unsent draft");
 await call("show-preview",{url:"http://localhost:8799/another"});
 const restored=(await call("back-material",{})).data;
 assert.equal(restored.stage.title,first.stage.title);assert.equal(restored.draft.title,"Private unsent draft");
 assert.equal(restored.canReturnToMaterial,false);
});
