import {asError} from "../shared/errors.ts";
import {readFile,writeFile} from "node:fs/promises";
const local=new URL("../.local/audience/",import.meta.url);
const target=JSON.parse((await readFile(new URL("deployment.json",local))).toString());
if(target.status!=="deployed")throw new Error("Deploy and verify the audience target first.");
const token=JSON.parse((await readFile(new URL("secrets.json",local))).toString()).PRESENTER_TOKEN;
const path=new URL("../.env",import.meta.url);
let env="";try{env=await readFile(path,"utf8");}catch (caught) { const error = asError(caught);if(error.code!=="ENOENT")throw error;}
for(const [key,value] of Object.entries({LECTURE_PORT:"4318",LECTURE_POLL_ORIGIN:target.origin,LECTURE_POLL_ROOM:"webdev-2026",LECTURE_POLL_TOKEN:token})){
 const line=key+"="+value,pattern=new RegExp("^"+key+"=.*$","m");env=pattern.test(env)?env.replace(pattern,line):env.trimEnd()+"\n"+line+"\n";
}
await writeFile(path,env,{mode:0o600});
console.log("Studio voting connection saved privately.");
