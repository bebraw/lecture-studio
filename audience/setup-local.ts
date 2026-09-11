import {mkdir,writeFile,access,readFile} from "node:fs/promises";
import {randomBytes} from "node:crypto";
const directory=new URL("../.local/audience/",import.meta.url);
await mkdir(directory,{recursive:true,mode:0o700});
const secrets=new URL("secrets.json",directory);
try{await access(secrets);}catch{await writeFile(secrets,JSON.stringify({PRESENTER_TOKEN:randomBytes(32).toString("hex")}),{mode:0o600,flag:"wx"});}
console.log("Private presenter credentials prepared; values not displayed.");
const token=JSON.parse(await readFile(secrets,"utf8")).PRESENTER_TOKEN;
await writeFile(new URL(".dev.vars",import.meta.url),"PRESENTER_TOKEN="+token+"\n",{mode:0o600,flag:"wx"}).catch(error=>{if(error.code!=="EEXIST")throw error;});
