import type {ChildProcess,SpawnOptions} from "node:child_process";
export type SpawnTunnel=(command:string,args:string[],options:SpawnOptions)=>ChildProcess;
import {asError} from "../shared/errors.ts";
import {spawn} from "node:child_process";

export class PreviewTunnel {
 binary:string;spawnProcess:SpawnTunnel;timeout:number;url:string;target:string;pending:Promise<string>|null;proc?:ChildProcess|null;cancel?:null|(()=>void);

 constructor({binary=process.env.LECTURE_CLOUDFLARED_BIN || "cloudflared",spawnProcess=spawn,timeout=30000}:{binary?:string;spawnProcess?:SpawnTunnel;timeout?:number}={}) {
  this.binary=binary;this.spawnProcess=spawnProcess;this.timeout=timeout;this.url="";this.target="";this.pending=null;
 }
 async open(value:string,studioOrigin:string) {
  const target=new URL(value),studio=new URL(studioOrigin);
  if(target.protocol==="https:")return value;
  if(target.protocol!=="http:" || !["localhost","127.0.0.1","[::1]"].includes(target.hostname) || !target.port || target.port===studio.port || target.username || target.password || target.search || target.hash)
   throw new Error("Only a separate local app port can be shared");
  if(this.target===target.origin && this.url)return this.url+target.pathname;
  if(this.pending)throw new Error("A preview tunnel is already starting");
  this.close();
  this.target=target.origin;
  let proc:ChildProcess;
  try {
   const ready=new Promise<string>((resolve,reject)=>{
    let output="",publicOrigin="";
    const timer=setTimeout(()=>reject(new Error("Preview sharing timed out; check cloudflared and retry")),this.timeout);
    const finish=(error?:Error)=>{clearTimeout(timer);this.cancel=null;error?reject(error):resolve(publicOrigin);};
    this.cancel=()=>finish(new Error("Preview sharing cancelled"));
    proc=this.spawnProcess(this.binary,["tunnel","--no-autoupdate","--protocol","http2","--url",target.origin,"--http-host-header",target.host],{stdio:["ignore","pipe","pipe"],shell:false});
    this.proc=proc;
    const onData=(chunk:Buffer|string)=>{
     output=(output+chunk.toString()).slice(-16000);
     publicOrigin=output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0] || publicOrigin;
     if(publicOrigin && output.includes("Registered tunnel connection"))finish();
    };
    proc.stdout!.on("data",onData);proc.stderr!.on("data",onData);
    proc.once("error",()=>finish(new Error("Cannot share preview: install cloudflared or set LECTURE_CLOUDFLARED_BIN")));
    proc.once("exit",()=>{if(this.proc===proc){this.url="";this.target="";this.proc=null;}finish(new Error("Preview tunnel stopped"));});
   });
   this.pending=ready;
   this.url=await ready;
   return this.url+target.pathname;
  } catch (caught) { const error = asError(caught);this.close();throw error;}
  finally {this.pending=null;}
 }
 publicUrl(value:string) {
  try {const target=new URL(value);return this.url && target.origin===this.target ? this.url+target.pathname : value;}catch{return value;}
 }
 close(){this.cancel?.();this.cancel=null;const proc=this.proc;this.proc=null;this.url="";this.target="";proc?.kill("SIGTERM");}
}
