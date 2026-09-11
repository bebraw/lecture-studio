import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {DatabaseSync} from "node:sqlite";
test("new lecture clears votes atomically; reopen and retry preserve them",async()=>{
 let source=await readFile(new URL("../audience/room-state.ts",import.meta.url),"utf8");
 source=source.replace('import { DurableObject } from "cloudflare:workers";','class DurableObject { constructor(ctx) { this.ctx=ctx; } }');
 const {RoomState}=await import("data:text/javascript;base64,"+Buffer.from(stripTypeScriptTypes(source)).toString("base64"));
 const db=new DatabaseSync(":memory:");
 const ctx={blockConcurrencyWhile(fn){fn();},storage:{
  sql:{exec(query,...args){
   if(query.includes("CREATE TABLE")){db.exec(query);return;}
   const rows=db.prepare(query).all(...args);return {toArray:()=>rows,one:()=>rows[0]};
  }},
  transactionSync(fn){db.exec("BEGIN");try{fn();db.exec("COMMIT");}catch(e){db.exec("ROLLBACK");throw e;}}
 }};
 try{
  const room=new RoomState(ctx,{});
  await room.seedChoices([{id:"a",label:"A"},{id:"b",label:"B"}]);
  await room.castVote("voter","a");
  assert.equal((await room.openSession("lecture-one")).totalVotes,0);
  await room.castVote("voter","b");
  await room.setStatus("locked");
  assert.equal((await room.openSession("lecture-one")).totalVotes,1);
  assert.equal((await room.openSession("lecture-one")).totalVotes,1);
  assert.equal((await room.openSession("lecture-two")).totalVotes,0);
  assert.equal((await room.castVote("voter","a")).snapshot.totalVotes,1);
  await assert.rejects(()=>room.openSession("bad session"));
 }finally{db.close();}
});
