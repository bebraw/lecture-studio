import {test,expect} from "@playwright/test";
import {fixture} from "../tests/fixture.mjs";
import {scope} from "../lib/narrative.mjs";
test("contextual exploration is private until explicit show; mappings follow cue not stage",async({browser})=>{
 const path=scope+"/Concepts/01 Web as hypermedia.md";
 const library={status:"Fixture",list:async()=>[{path,label:"Concepts/01 Web as hypermedia"}],read:async()=>({path,title:"Early web",sections:[{heading:"Stage block",body:"Documents have addresses."},{heading:"Servers",body:"A browser requests a document from a server."}]}),close:async()=>{}};
 const {studio,address,bridge}=await fixture({library});
 const context=await browser.newContext({viewport:{width:1600,height:1100}});
 try{
   const desk=await context.newPage(),stage=await context.newPage();
   await desk.goto(address.deskUrl);await stage.goto(address.stageUrl);
   await expect(desk.locator(".explorer")).toBeVisible();
   await desk.getByRole("button",{name:"Early web",exact:true}).click();
   await expect(desk.locator("#explore-excerpt")).toContainText("Documents have addresses.");
   await expect(stage.locator("h1")).toHaveText("Who is the interface for?");
   await desk.locator("#explore-query").fill("server");
   await desk.locator("#explore-search-form button").click();
   await desk.locator(".explore-result").click();
   await expect(desk.locator("#explore-excerpt")).toContainText("browser requests");
   await expect(stage.locator("h1")).toHaveText("Who is the interface for?");
   await desk.locator("#explore-show").click();
   await expect(stage.locator("h1")).toHaveText("Early web");
   expect(bridge.lastPrompt).toBeUndefined();
   await desk.locator("#next-beat").click();
   await expect(desk.locator("#explore-shortcuts")).toContainText("First browser");
   await expect(stage.locator("h1")).toHaveText("Early web");
   await desk.locator("#prepare-mode").click();
   await desk.locator(".explore-prepare summary").click();
   await desk.locator("#explore-mappings").fill("My server note | Concepts/01 Web as hypermedia.md | Servers");
   await desk.locator("#explore-save").click();
   await desk.locator("#present-mode").click();
   await expect(desk.locator("#explore-shortcuts")).toContainText("My server note");
   await desk.getByRole("button",{name:"My server note",exact:true}).click();
   await expect(desk.locator("#explore-excerpt")).toContainText("browser requests");
   await desk.screenshot({path:"test-results/explore.png",fullPage:true});
 }finally{await context.close();await new Promise(resolve=>studio.server.close(resolve));}
});
