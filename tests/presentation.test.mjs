import {test} from "node:test";
import assert from "node:assert/strict";
import {parsePresentation,PresentationSession,parseTheme} from "../lib/presentation.mjs";
const definition={version:1,title:"Test",start:"question",steps:[{id:"question",type:"question",title:"Question",next:"poll",related:["aside"]},{id:"aside",type:"material",title:"Aside"},{id:"poll",type:"poll",title:"Theme",room:"test",poll:{question:"Theme?",options:[{id:"one",label:"One"},{id:"two",label:"Two"}],defaultId:"one"},next:"build"},{id:"build",type:"build",title:"Build",body:"Implement.",uses:[{poll:"poll",instructions:{one:"Use one.",two:"Use two."}}]}]};
const note=value=>({sections:[{heading:"Presentation",body:"```json\n"+JSON.stringify(value)+"\n```"}]});
test("slide numbering includes detours while progress follows the lecture path",()=>{
 const d={version:1,title:"Deck",start:"a",steps:[
 {id:"a",type:"material",title:"A",next:"b",related:["aside"]},
 {id:"b",type:"material",title:"B",next:"refs"},
 {id:"refs",type:"material",title:"References",chapter:"References"},
 {id:"aside",type:"material",title:"Aside"}]};
 const session=new PresentationSession(parsePresentation(note(d)),"test");
 assert.deepEqual(session.position(),{number:1,total:4,progress:.5});
 session.move("detour","aside");assert.equal(session.position().progress,.5);
 session.move("return");session.move("next");assert.equal(session.position().progress,1);
 session.move("next");assert.equal(session.position().number,3);
 session.move("select","aside");assert.equal(session.position().progress,null);
});
test("remote slide images require an explicit boolean opt-in",()=>{
 const d={version:1,title:"Images",start:"image",steps:[{id:"image",type:"material",title:"Browser",body:"![Browser](https://www.w3.org/browser.gif)"}]};
 const preview=()=>new PresentationSession(parsePresentation(note(d)),"test").state().preview.html;
 assert.doesNotMatch(preview(),/<img /);
 d.steps[0].allowRemoteImages=true;
 assert.match(preview(),/<img referrerpolicy="no-referrer"/);
 d.steps[0].allowRemoteImages="true";
 assert.throws(preview,/Invalid remote image/);
});
test("presentation themes default to white and validate overrides",()=>{
 assert.equal(parseTheme().background,"#ffffff");
 assert.equal(parseTheme({headingFont:"Verdana, sans-serif"}).headingFont,"Verdana, sans-serif");
 assert.throws(()=>parseTheme({background:"url(example)"}),/Invalid theme/);
 assert.throws(()=>parseTheme({bodyFont:"bad; color:red"}),/Invalid theme/);
 assert.equal(new PresentationSession(parsePresentation(note(definition)),"test").state().theme.text,"#202020");
});
test("presentation snapshot, detour return and explicit defaults",()=>{
 const p=new PresentationSession(parsePresentation(note(definition)),"test");
 definition.steps[0].title="Changed";
 assert.equal(p.step().title,"Question");
 p.move("detour","aside");p.move("return");assert.equal(p.current,"question");
 p.move("next");p.move("next");
 assert.deepEqual(p.resolve().missing,["poll"]);
 p.defaults.add("build");assert.match(p.resolve().prompt,/Use one/);
 p.decisions.poll={winner:{id:"two",label:"Two"},revision:7};
 assert.match(p.resolve().prompt,/Use two/);
 assert.equal(p.resolve().inputs[0].revision,7);
});
test("invalid graph links are rejected",()=>{
 assert.throws(()=>parsePresentation(note({...definition,start:"missing"})),/Missing start/);
});
