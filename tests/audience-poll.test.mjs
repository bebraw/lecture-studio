import test from "node:test";
import assert from "node:assert/strict";
import { AudiencePoll, themePoll } from "../lib/audience-poll.mjs";
export function pollFixture(){
 let snapshot={status:"locked",revision:1,totalVotes:0,choices:themePoll().options.map(o=>({...o,votes:0}))};
 const calls=[];
 const poll=new AudiencePoll({origin:"https://audience.example",token:"private-presenter-secret",fetcher:async(url,init)=>{
   calls.push({url,init});
   if(url.endsWith("/open-session"))snapshot={...snapshot,status:"open",revision:snapshot.revision+1};
   if(url.endsWith("/lock"))snapshot={...snapshot,status:"locked",revision:snapshot.revision+1};
   return new Response(JSON.stringify(snapshot));
 }});
 return {poll,calls,votes:(counts)=>{snapshot={...snapshot,revision:snapshot.revision+1,choices:snapshot.choices.map((c,i)=>({...c,votes:counts[i]})),totalVotes:counts.reduce((a,b)=>a+b,0)};}};
}
test("open, aggregate, lock, freeze, receipt; no votes or resets sent",async()=>{
 const {poll,calls,votes}=pollFixture();
 assert.throws(()=>poll.receipt());
 await poll.act("open");votes([1,3,2]);await poll.act("refresh");
 await poll.act("lock");const receipt=poll.receipt();
 assert.equal(poll.frozen.winner.id,"retro-web");
 votes([100,0,0]);assert.equal(poll.receipt(),receipt);
 await poll.act("open");
 assert.equal(poll.frozen,null);
 assert.equal(poll.snapshot.status,"open");
 assert.equal(poll.snapshot.totalVotes,100);
 assert.throws(()=>poll.receipt(),/Close/);
 await poll.act("lock");
 assert.equal(poll.frozen.winner.id,"editorial");
 assert.ok(!JSON.stringify(poll.state()).includes("private-presenter-secret"));
 assert.ok(calls.every(c=>!c.url.endsWith("/reset")&&!c.url.endsWith("/seed")));
 assert.ok(calls.filter(c=>c.init.method==="GET").every(c=>!c.init.headers.Authorization));
});
test("zero votes and ties are deterministic and labeled",async()=>{
 const a=pollFixture();await a.poll.act("lock");assert.equal(a.poll.frozen.winner.id,"editorial");assert.match(a.poll.frozen.reason,/No votes/);
 const b=pollFixture();await b.poll.act("open");b.votes([0,2,2]);await b.poll.act("lock");assert.equal(b.poll.frozen.winner.id,"retro-web");assert.match(b.poll.frozen.reason,/Tie/);
});
test("mismatched room is refused before mutation",async()=>{
 const {poll,calls}=pollFixture();poll.configure({...themePoll(),options:[{id:"different",label:"Different"},{id:"other",label:"Other"}],defaultId:"different"});
 await assert.rejects(()=>poll.act("open"),/match/);assert.equal(calls.length,1);assert.equal(calls[0].init.method,"GET");
});

test("lecture reset rotates the session; reopen retains it and refresh hides old counts",async()=>{
 const {poll,calls,votes}=pollFixture();
 votes([4,2,1]);await poll.act("refresh");assert.equal(poll.snapshot.totalVotes,0);
 await poll.act("open");const first=calls.at(-1).init.headers["X-Lecture-Session"];
 await poll.act("lock");await poll.act("open");
 assert.equal(calls.at(-1).init.headers["X-Lecture-Session"],first);
 await poll.act("lock");poll.reset();await poll.act("open");
 assert.notEqual(calls.at(-1).init.headers["X-Lecture-Session"],first);
});
