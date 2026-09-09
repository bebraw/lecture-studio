import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {renderMarkdown} from "../lib/material.mjs";
const css=await readFile(new URL("../public/style.css",import.meta.url),"utf8");
const fixtures=[
 ["image","WorldWideWeb browser-editor",'<image-placeholder>'],
 ["table","Human accessibility and agent interaction","| Shared design | Human accessibility | Agent use |\n|---|---|---|\n| Named controls | Identify purpose | Identify action |\n| Explicit inputs | Understand choices | Construct valid input |\n| Exposed state | Perceive feedback | Check the outcome |\n| Stable structure | Navigate consistently | Locate relevant controls |"],
 ["code","HTML forms",'```html\n<form action="/vote" method="post">\n  <label for="topic">Your topic</label>\n  <select id="topic" name="topic">\n    <option value="learning">Learning outcomes</option>\n    <option value="practical">Practical details</option>\n  </select>\n  <button>Vote</button>\n</form>\n```'],
 ["question","What would you change in our app so an agent wouldn’t have to guess?","Discuss with a neighbour for two minutes. Suggest one specific change."],
];
for(const size of [{width:1920,height:1080},{width:1280,height:720}])for(const [name,title,body]of fixtures){
 test(name+" fits "+size.width,async({page})=>{
 await page.setViewportSize(size);
 await page.setContent('<style>'+css+'</style><body class="stage"><header>WEB DEVELOPMENT / 2026</header><main id="stage-content" class="stage-surface"><h1>'+title+'</h1><div class="stage-copy">'+renderMarkdown(body)+'</div></main><footer class="stage-bottom"><a id="student-link">live.scalableweb.dev</a><span id="source-credit">Lecture model · [R13] Approved, unpublished position paper (2026)</span><span id="build-signal">Ready</span></footer></body>');
 if(name==="image")await page.locator(".stage-copy").evaluate(e=>{
   const img=document.createElement("img");img.alt="Historical browser screenshot";img.width=1600;img.height=1000;
   img.src="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#eee"/></svg>');
   e.replaceChildren(img);
 });
 expect(await page.locator("#stage-content").evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1)).toBe(true);
 expect(await page.locator("body").evaluate(e=>e.scrollHeight<=innerHeight+1)).toBe(true);
 });
}
