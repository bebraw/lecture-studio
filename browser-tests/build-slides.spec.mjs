import {test,expect} from "@playwright/test";
import {fixture} from "../tests/fixture.mjs";
test("build slide shows the exact prompt and starts only on explicit launch",async({browser})=>{
 const {studio,address,bridge}=await fixture();
 const context=await browser.newContext();
 try{
   const desk=await context.newPage(),stage=await context.newPage();
   await desk.goto(address.deskUrl);await stage.goto(address.stageUrl);
   for(let i=0;i<4;i++)await desk.locator("#next-beat").click();
   await expect(stage.locator("h1")).toHaveText("Build · Create the seminar document");
   await expect(stage.locator("body")).toContainText("Build Document A");
   expect(bridge.lastPrompt).toBeUndefined();
   await expect(desk.locator("#start-slide-build")).toBeDisabled();
   await desk.locator("#connections summary").click();
   await desk.locator("#connect-codex").click();
   await desk.keyboard.press("Escape");
   await expect(desk.locator("#start-slide-build")).toBeEnabled();
   const shown=await desk.locator("#live-question").textContent();
   await desk.locator("#start-slide-build").click();
   await expect.poll(()=>bridge.lastPrompt).toBe(shown);
   await expect(desk.locator("#start-slide-build")).toBeDisabled();
   await desk.locator("#next-beat").click();
   await expect(stage.locator("h1")).toHaveText("A link offers a next step.");
   expect(bridge.state.status).toBe("waiting");
 }finally{await context.close();await new Promise(resolve=>studio.server.close(resolve));}
});
