import test from "node:test";
import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {PreviewTunnel} from "../lib/preview-tunnel.mjs";
test("shares only the selected app, waits for connection, reuses and stops its tunnel",async()=>{
 let args,killed=0,proc;
 const tunnel=new PreviewTunnel({spawnProcess:(...a)=>{
  args=a;proc=new EventEmitter();proc.stdout=new EventEmitter();proc.stderr=new EventEmitter();proc.kill=()=>killed++;
  queueMicrotask(()=>proc.stderr.emit("data","https://sample-demo.trycloudflare.com\nRegistered tunnel connection"));return proc;
 }});
 await assert.rejects(()=>tunnel.open("http://localhost:4317/desk","http://127.0.0.1:4317"),/separate/);
 await assert.rejects(()=>tunnel.open("http://192.168.1.2:8000/","http://127.0.0.1:4317"),/separate/);
 assert.equal(await tunnel.open("http://localhost:8799/app","http://127.0.0.1:4317"),"https://sample-demo.trycloudflare.com/app");
 assert.ok(args[1].includes("localhost:8799"));assert.equal(args[2].shell,false);
 assert.equal(await tunnel.open("http://localhost:8799/other","http://127.0.0.1:4317"),"https://sample-demo.trycloudflare.com/other");
 assert.equal(tunnel.publicUrl("http://localhost:8800/"),"http://localhost:8800/");
 tunnel.close();assert.equal(killed,1);assert.equal(tunnel.url,"");
});
test("missing tunnel binary fails clearly and clears state",async()=>{
 const tunnel=new PreviewTunnel({spawnProcess:()=>{
  const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{};
  queueMicrotask(()=>p.emit("error",new Error("ENOENT")));return p;
 }});
 await assert.rejects(()=>tunnel.open("http://localhost:8799/","http://127.0.0.1:4317"),/install cloudflared/);
 assert.equal(tunnel.pending,null);assert.equal(tunnel.url,"");
});
