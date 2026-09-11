// Local-only acceptance test: never points at the deployed lecture.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {chromium} from "@playwright/test";
const origin="http://127.0.0.1:8796";
const {PRESENTER_TOKEN:token}=JSON.parse((await readFile(new URL("../.local/audience/secrets.json",import.meta.url))).toString());
const headers={authorization:"Bearer "+token,"content-type":"application/json"};
const stop=()=>fetch(origin+"/presenter/stage",{method:"POST",headers,body:JSON.stringify({live:false,title:"Waiting for the lecturer",html:""})});
const admin=async(id:string,op:string)=>{const response=await fetch(origin+"/presenter/rooms/"+id+"/"+op,{method:"POST",headers});assert.equal(response.status,200);};
const publish=async (title:string)=>{const response=await fetch(origin+"/presenter/stage",{method:"POST",headers,body:JSON.stringify({title,act:"past",mode:"material",html:"<p>Shared slide content</p>",version:title,theme:{background:"#ffffff",headingFont:"Verdana, sans-serif"},notes:"PRIVATE"})});assert.equal(response.status,200);};
for(const id of ["webdev-2026","webdev-2026-friction","webdev-2026-priority"]){await admin(id,"seed");await admin(id,"lock");}
assert.equal((await fetch(origin+"/presenter/stage",{method:"POST",body:"{}"})).status,401);
await publish("A shared stage");
assert.doesNotMatch(await(await fetch(origin+"/api/audience")).text(),/PRIVATE/);
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(origin);await page.getByRole("heading",{name:"A shared stage"}).waitFor();
 await admin("webdev-2026","open");
 assert.equal((await stop()).status,409);
 await page.getByRole("heading",{name:"Which visual theme should shape our app?"}).waitFor();
 await page.getByLabel("Editorial",{exact:true}).check();
 await publish("The projector moved on");
 await page.waitForTimeout(1800);
 assert.equal(await page.getByLabel("Editorial",{exact:true}).isChecked(),true);
 await page.getByRole("button",{name:"Vote",exact:true}).click();
 await page.getByRole("button",{name:"Vote saved · change vote"}).waitFor();
 assert.equal(page.url(),origin+"/");
 await page.screenshot({path:new URL("../test-results/audience-vote.png",import.meta.url).pathname});
 await admin("webdev-2026","lock");
 await page.getByRole("heading",{name:"The projector moved on"}).waitFor();
 assert.equal(await page.locator("form").count(),0);
 assert.equal(await page.locator("h1").evaluate(el=>getComputedStyle(el).fontFamily),"Verdana, sans-serif");
 await page.screenshot({path:new URL("../test-results/audience-stage.png",import.meta.url).pathname});
 assert.equal((await stop()).status,200);
 assert.deepEqual(await(await fetch(origin+"/api/audience")).json(),{stage:null,poll:null});
 await page.getByRole("heading",{name:"Waiting for the lecturer"}).waitFor();
 await page.reload();await page.getByRole("heading",{name:"Waiting for the lecturer"}).waitFor();
 await publish("Broadcast resumed");await page.getByRole("heading",{name:"Broadcast resumed"}).waitFor();
 console.log("Shared stage, private-field exclusion, independent voting, focus preservation, vote replacement form, return to stage and mobile theme passed.");
}finally{await browser.close();await admin("webdev-2026","lock");}
