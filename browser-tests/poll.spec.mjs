import {test,expect} from "@playwright/test";
import {AudiencePoll,themePoll} from "../lib/audience-poll.mjs";
import {fixture} from "../tests/fixture.mjs";
test("audience result is projected deliberately and added only after freeze",async({browser})=>{
 let snapshot={status:"locked",revision:1,totalVotes:5,choices:themePoll().options.map((o,i)=>({...o,votes:[1,3,1][i]}))};
 const poll=new AudiencePoll({origin:"https://audience.example",token:"private-secret",fetcher:async(url)=>{
   if(url.endsWith("/open-session"))snapshot={...snapshot,status:"open",revision:2};
   if(url.endsWith("/lock"))snapshot={...snapshot,status:"locked",revision:3};
   return new Response(JSON.stringify(snapshot));
 }});
 const {studio,address,bridge}=await fixture({poll});
 const context=await browser.newContext({viewport:{width:1600,height:1100}});
 try{
   const desk=await context.newPage(),stage=await context.newPage();
   await desk.goto(address.deskUrl);await stage.goto(address.stageUrl);
   await desk.locator(".audience-poll summary").click();
   await expect(desk.locator("#poll-add")).toBeDisabled();
   await desk.locator("#poll-open").click();
   await expect(desk.locator("#poll-counts")).toContainText("Retro web: 3");
   await expect(stage.locator("h1")).toHaveText("Who is the interface for?");
   await desk.locator("#poll-show").click();
   await expect(stage.locator("h1")).toHaveText(themePoll().question);
   await expect(stage.locator("body")).not.toContainText("private-secret");
   const before=await desk.locator("#brief").inputValue();
   await desk.locator("#poll-lock").click();
   await expect(stage.locator(".stage-copy")).toContainText("Selected: Retro web");
   await expect(desk.locator("#brief")).toHaveValue(before);
   await desk.locator("#poll-add").click();
   await expect(desk.locator("#brief")).toHaveValue(/retro-web/);
   expect(bridge.lastPrompt).toBeUndefined();
   await desk.locator("#show-brief").click();
   await expect(stage.locator(".brief-copy")).toContainText("retro-web");
   await desk.locator("#back-material").click();
   await expect(stage.locator("h1")).toHaveText("Who is the interface for?");
   await desk.screenshot({path:"test-results/audience-poll.png",fullPage:true});
 }finally{await context.close();await new Promise(resolve=>studio.server.close(resolve));}
});
