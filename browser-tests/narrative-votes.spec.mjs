import {test,expect} from "@playwright/test";
import {AudiencePoll,lecturePolls} from "../lib/audience-poll.mjs";
import {fixture} from "../tests/fixture.mjs";
test("separate narrative votes become explicit build requirements",async({browser})=>{
 const poll=new AudiencePoll({origin:"https://audience.example",token:"secret",fetcher:async url=>{
   const id=url.includes("-friction")?"friction":url.includes("-priority")?"priority":"theme";
   const options=lecturePolls[id].options;
   return new Response(JSON.stringify({status:url.endsWith("/open-session")?"open":"locked",revision:3,totalVotes:4,choices:options.map((o,i)=>({...o,votes:i===1?4:0}))}));
 }});
 const {studio,address,bridge}=await fixture({poll});
 const context=await browser.newContext();
 try{
   const desk=await context.newPage(),stage=await context.newPage();
   await desk.goto(address.deskUrl);await stage.goto(address.stageUrl);
   await desk.locator("#next-beat").click();
   await desk.locator("#slide-vote-open").click();
   await desk.locator("#slide-vote-close").click();
   expect(poll.decisions().friction.winner.id).toBe("repeating");
   await desk.locator("#next-beat").click();
   await desk.locator("#next-beat").click();
   await desk.locator("#slide-vote-open").click();
   await desk.locator("#slide-vote-close").click();
   await expect(stage.locator("body")).toContainText("Preserve the audience's choice");
   await expect(stage.locator("body")).toContainText("retro-web visual theme");
   expect(poll.decisions().theme.winner.id).toBe("retro-web");
   expect(bridge.lastPrompt).toBeUndefined();
   await desk.locator("#connections summary").click();await desk.locator("#connect-codex").click();await desk.keyboard.press("Escape");
   await desk.locator("#start-slide-build").click();
   await expect.poll(()=>bridge.lastPrompt||"").toContain("retro-web visual theme");
   expect(bridge.lastPrompt).toContain("Preserve the audience's choice");
 }finally{await context.close();await new Promise(resolve=>studio.server.close(resolve));}
});
