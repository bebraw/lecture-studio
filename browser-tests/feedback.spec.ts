import {test,expect} from "@playwright/test";
import {fixture} from "../tests/fixture.ts";
import {AudiencePoll} from "../lib/audience-poll.ts";
import {initialDraft} from "../lib/narrative.ts";
test("desk review publishes only selected questions or approved cloud snapshots",async({browser})=>{
 let snapshot={config:{mode:"questions",prompt:"Questions",round:"one",open:true},items:[{id:"q",text:"Why use HTML?",status:"pending"}]};
 const poll=new AudiencePoll({origin:"https://feedback.invalid",token:"test",fetcher:async(url,init)=>{
   if(url.endsWith("/presenter/stage"))return new Response(null,{status:204});
   const body=init.body&&JSON.parse(String(init.body));
   if(body?.action==="start")snapshot={config:{mode:body.mode,prompt:body.prompt,round:"two",open:true},items:[{id:"w",text:"hypermedia",status:"pending"},{id:"bad",text:"NOT APPROVED",status:"pending"}]};
   if(body?.action==="approve")snapshot.items.find(x=>x.id===body.id)!.status="approved";
   if(body?.action==="done")snapshot.items.find(x=>x.id===body.id)!.status="done";
   return Response.json(snapshot);
 }});
 const {studio,address}=await fixture({poll});const context=await browser.newContext();
 try{
   const desk=await context.newPage(),stage=await context.newPage();
   const headers={origin:address.origin,authorization:"Bearer "+address.deskToken,"content-type":"application/json"};
   const draft={...initialDraft(),mode:"material",act:"opening",title:"Original slide",body:"Discussion",source:""};
   const published=await fetch(address.origin+"/api/publish",{method:"POST",headers,body:JSON.stringify(draft)});
   expect(published.status).toBe(200);
   await desk.goto(address.deskUrl);await stage.goto(address.stageUrl);
   await desk.locator("#feedback-menu>summary").click();
   await expect(desk.locator("#feedback-items")).toContainText("Why use HTML?");
   await expect(stage.locator("h1")).toHaveText("Original slide");
   await desk.getByRole("button",{name:"Discuss",exact:true}).click();
   await expect(stage.locator("h1")).toHaveText("Why use HTML?");
   await desk.getByRole("button",{name:"Back to slide",exact:true}).click();
   await expect(stage.locator("h1")).toHaveText("Original slide");
   await desk.locator("#feedback-mode").selectOption("words");
   desk.once("dialog",dialog=>dialog.accept());
   await desk.getByRole("button",{name:"Open new collection",exact:true}).click();
   const approved=desk.locator(".feedback-item").filter({hasText:"hypermedia"});
   await approved.getByRole("button",{name:"Approve",exact:true}).click();
   await expect(stage.locator("h1")).toHaveText("Original slide");
   await desk.getByRole("button",{name:"Show approved cloud",exact:true}).click();
   await expect(stage.locator(".word-cloud")).toContainText("hypermedia");
   await expect(stage.locator("body")).not.toContainText("NOT APPROVED");
   await desk.screenshot({path:"test-results/feedback-desk.png",fullPage:true});
   await stage.screenshot({path:"test-results/feedback-cloud.png"});
 }finally{await context.close();await new Promise(resolve=>studio.server.close(resolve));}
});
