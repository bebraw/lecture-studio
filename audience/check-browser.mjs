import {chromium} from "@playwright/test";
import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const origin="http://127.0.0.1:8796",room="webdev-2026-friction";
const {PRESENTER_TOKEN:token}=JSON.parse(await readFile(new URL("../.local/audience/secrets.json",import.meta.url)));
const admin=action=>fetch(origin+"/presenter/rooms/"+room+"/"+action,{method:"POST",headers:{authorization:"Bearer "+token}});
await admin("open");
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(origin+"/rooms/"+room);
 await page.locator('input[value="trust"]').check();
 const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==="POST"),page.getByRole("button",{name:"Vote",exact:true}).click()]);
 assert.equal(response.status(),303);
 console.log("Local real-browser native form submission passed.");
}finally{await browser.close();await admin("lock");}
