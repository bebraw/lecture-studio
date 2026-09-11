import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const origin="http://127.0.0.1:8796";
const {PRESENTER_TOKEN:token}=JSON.parse((await readFile(new URL("../.local/audience/secrets.json",import.meta.url))).toString());
const admin=async(room:string,action:string)=>{const r=await fetch(origin+"/presenter/rooms/"+room+"/"+action,{method:"POST",headers:{authorization:"Bearer "+token}});assert.equal(r.status,200);return r.json();};
for(const room of ["webdev-2026-friction","webdev-2026","webdev-2026-priority"]){
 const unauthorized=await fetch(origin+"/presenter/rooms/"+room+"/open",{method:"POST"});assert.equal(unauthorized.status,401);
 const seeded=await admin(room,"seed");await admin(room,"lock");
 const page=await fetch(origin+"/rooms/"+room);assert.equal(page.status,200);assert.match(await page.text(),/<form/);
 const send=(choice:string,from=origin,cookie="")=>fetch(origin+"/rooms/"+room,{method:"POST",headers:{origin:from,cookie,"content-type":"application/x-www-form-urlencoded"},body:"choice="+choice,redirect:"manual"});
 assert.equal((await send(seeded.choices[0].id)).status,409);
 await admin(room,"open");
 assert.equal((await send(seeded.choices[0].id,"https://unrelated.invalid")).status,403);
 assert.equal((await send("invalid-option")).status,400);
 const vote=await send(seeded.choices[0].id);assert.equal(vote.status,303);
 const cookie=vote.headers.get("set-cookie")!.split(";")[0];
 assert.equal((await send(seeded.choices[1].id,origin,cookie)).status,303);
 const result=await admin(room,"lock");
 const repeated=await admin(room,"seed");
 assert.equal(repeated.totalVotes,result.totalVotes);assert.equal(repeated.status,"locked");
 console.log(room+": form, authorization, origin checks, replacement and locking passed");
}
assert.equal((await fetch(origin+"/rooms/not-allowed")).status,404);
