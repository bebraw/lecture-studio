import type {StudioOptions} from "../server.ts";
import type {Bridge} from "../shared/models.ts";
import {scope} from "../lib/narrative.ts";
import {createStudio} from "../server.ts";
export async function fixture(options:StudioOptions = {}) {
 const bridge:Bridge & {lastPrompt?:string} = {
   state:{status:"disconnected",activity:"Not connected",models:[],messages:[{id:"1",text:"private-output"}],requests:[],turnId:null,threadId:null},
   snapshot(){return this.state},
   async connect(){this.state={...this.state,status:"ready"}},
   async start(prompt:string){this.lastPrompt=prompt;this.state={...this.state,status:"waiting",turnId:"fake-turn",activity:"Presenter input needed",requests:[{id:12,method:"item/commandExecution/requestApproval",params:{command:"private-test-command",reason:"Private approval fixture"}}]}},
   async interrupt(){this.state={...this.state,status:"ready",turnId:null,requests:[]}},
   answer(){this.state={...this.state,status:"ready",turnId:null,requests:[],messages:[{id:"done",text:"Fixture implementation complete."}]}},close(){}
 };
 const library={status:"Fixture",async list(){return [{path:scope+"/Example.md",label:"Example"}]}, async read(path:string){return {path,title:"Progressive enhancement",sections:[{heading:"Stage block",body:"A capability that survives."},{heading:"Presenter",body:"private-note"},{heading:"Visual",body:"```mermaid\nflowchart LR\nA[HTML] --> B[Enhancement]\n```"}]}},async close(){}};
 const studio=createStudio({bridge,library,port:0,persist:false,...options});
 return {studio,bridge,address:await studio.start()};
}
