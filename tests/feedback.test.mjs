import test from "node:test";
import assert from "node:assert/strict";
import {feedbackSlide} from "../lib/feedback.mjs";
test("word clouds contain only approved escaped text and frozen counts",()=>{
 const snapshot={config:{mode:"words",prompt:"Your words"},items:[{text:"Web",status:"approved"},{text:"web",status:"approved"},{text:"PRIVATE",status:"pending"},{text:"REMOVED",status:"done"},{text:"<script>",status:"approved"}]};
 const slide=feedbackSlide(snapshot);
 assert.match(slide.html,/web<small> ×2/);assert.match(slide.html,/&lt;script&gt;/);
 assert.doesNotMatch(slide.html,/PRIVATE|REMOVED|<script>/);
 snapshot.items.push({text:"later",status:"approved"});assert.doesNotMatch(slide.html,/later/);
});
test("question projection requires a selected non-dismissed question",()=>{
 const snapshot={config:{mode:"questions"},items:[{id:"one",text:"Why?",status:"pending"},{id:"two",text:"Hidden",status:"done"}]};
 assert.equal(feedbackSlide(snapshot,"one").title,"Why?");
 assert.throws(()=>feedbackSlide(snapshot,"two"));
 assert.throws(()=>feedbackSlide(snapshot));
});
