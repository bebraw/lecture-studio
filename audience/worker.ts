import {handleRoomRequest,readRoomSnapshot} from "./room-http";
import {renderRoomFragment} from "./room-view";
export {RoomState} from "./room-state";

const rooms:Record<string,{question:string;choices:{id:string;label:string}[]}>={
 "webdev-2026-friction":{question:"What feels unnecessarily difficult on the web?",choices:[{id:"finding",label:"Finding information"},{id:"repeating",label:"Repeating information"},{id:"navigation",label:"Navigating interfaces"},{id:"trust",label:"Knowing what to trust"}]},
 "webdev-2026":{question:"Which visual theme should shape our app?",choices:[{id:"editorial",label:"Editorial"},{id:"retro-web",label:"Retro web"},{id:"playful",label:"Playful"}]},
 "webdev-2026-priority":{question:"What should the seminar view prioritize?",choices:[{id:"overview",label:"Quick overview"},{id:"learning",label:"Learning outcomes"},{id:"practical",label:"Practical details"}]}
};
const css="body{font:18px/1.5 system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#202020;background:white}h1{font-size:1.6rem}fieldset{border:1px solid #aaa;padding:1rem}fieldset div{padding:.6rem 0}button{font:inherit;padding:.6rem 1.2rem;margin-top:1rem}a{color:inherit}input{margin-right:.5rem}";
function html(title:string,body:string){return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+'</title><link rel="stylesheet" href="/style.css"><main><h1>'+title+'</h1>'+body+'</main></html>',{headers:{"content-type":"text/html;charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'","x-content-type-options":"nosniff","referrer-policy":"same-origin"}});}
async function authorized(request:Request,secret:string){
 if(!secret||secret.length<32)return false;
 const supplied=request.headers.get("authorization")||"";
 if(supplied.length>4096)return false;
 const encoder=new TextEncoder();
 const hashes=await Promise.all([supplied,"Bearer "+secret].map(value=>crypto.subtle.digest("SHA-256",encoder.encode(value))));
 return crypto.subtle.timingSafeEqual(hashes[0],hashes[1]);
}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
   const url=new URL(request.url);
   if(url.pathname==="/style.css"&&request.method==="GET")return new Response(css,{headers:{"content-type":"text/css","x-content-type-options":"nosniff"}});
   if(url.pathname==="/"&&request.method==="GET")return html("Lecture audience",'<p>Choose the poll your lecturer has opened.</p><ul>'+Object.entries(rooms).map(([id,room])=>'<li><a href="/rooms/'+id+'">'+room.question+'</a></li>').join("")+"</ul>");
   const match=/^\/(rooms|api\/rooms|presenter\/rooms)\/([a-z0-9-]+)(?:\/(seed|open|lock))?$/.exec(url.pathname);
   if(!match||!Object.hasOwn(rooms,match[2]))return new Response("Not found",{status:404});
   const [,kind,id,operation]=match,definition=rooms[id];
   const room=env.ROOM_STATE.getByName(id);
   if(kind==="presenter/rooms"){
     if(request.method!=="POST")return new Response("Method not allowed",{status:405});
     if(!await authorized(request,env.PRESENTER_TOKEN))return new Response("Unauthorized",{status:401});
     if(!operation)return new Response("Not found",{status:404});
     if(operation==="seed"){
       // Only initialize an empty room. Repeated setup never resets existing votes.
       await room.initializeChoices(definition.choices);
     }else await room.setStatus(operation==="open"?"open":"locked");
   }else if(operation)return new Response("Not found",{status:404});
   else if(kind==="rooms"){
     if(request.method==="GET"){
       const snapshot=await readRoomSnapshot(request,env,id);
       return html(definition.question,renderRoomFragment({roomId:id,snapshot})+'<p><a href="/">All polls</a> · <a href="/rooms/'+id+'">Refresh results</a></p><p>Your browser remembers your vote. Changing your choice replaces it.</p>');
     }
     return await handleRoomRequest(request,env,{voterCookieMaxAgeSeconds:14400})||new Response("Not found",{status:404});
   }else if(request.method!=="GET")return new Response("Method not allowed",{status:405});
   const snapshot=await room.getSnapshot();
   return Response.json({choices:snapshot.choices,status:snapshot.status,revision:snapshot.revision,totalVotes:snapshot.totalVotes},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
 }
};
