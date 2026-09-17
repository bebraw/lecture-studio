import {
  parse,
  parseFragment,
  serialize,
  defaultTreeAdapter as tree,
} from "parse5";
import { demoContentCsp } from "./web-demo.ts";

export function demoDocument(html: string, controller: boolean) {
  const document = parse(html);
  // Parse full documents and fragments alike; never concatenate two documents.
  const root = document.childNodes.find(
    (node) => "tagName" in node && node.tagName === "html",
  );
  if (!root || !("tagName" in root))
    throw new Error("Missing demo document root");
  const head = root.childNodes.find(
    (node) => "tagName" in node && node.tagName === "head",
  );
  if (!head || !("tagName" in head))
    throw new Error("Missing demo document head");
  document.childNodes = document.childNodes.filter(
    (node) => node.nodeName !== "#documentType",
  );
  tree.setDocumentType(document, "html", "", "");
  const doctype = document.childNodes.pop()!;
  document.childNodes.unshift(doctype);
  if (!root.attrs.some((attr) => attr.name === "lang"))
    root.attrs.push({ name: "lang", value: "en" });
  // The output is UTF-8 even when the input declares another encoding.
  head.childNodes = head.childNodes.filter(
    (node) =>
      !(
        "tagName" in node &&
        node.tagName === "meta" &&
        node.attrs.some(
          (attr) =>
            attr.name === "charset" ||
            (attr.name === "http-equiv" &&
              attr.value.toLowerCase() === "content-type"),
        )
      ),
  );
  const viewport = head.childNodes.some(
    (node) =>
      "tagName" in node &&
      node.tagName === "meta" &&
      node.attrs.some(
        (attr) =>
          attr.name === "name" && attr.value.toLowerCase() === "viewport",
      ),
  );
  const title = head.childNodes.some(
    (node) => "tagName" in node && node.tagName === "title",
  );
  // Handshake readiness only after authored scripts load and the first state renders.
  const bootstrap = `<script>(()=>{let state={},listeners=[],initialized=false,failed=false;const role=${JSON.stringify(controller ? "controller" : "viewer")};const send=type=>parent.postMessage({type},"*");const fail=()=>{failed=true;send("lecture-demo:error")};addEventListener("error",fail);addEventListener("unhandledrejection",fail);window.LectureDemo={role,onState(fn){listeners.push(fn);fn(state)},setState(value){if(role==="controller")parent.postMessage({type:"lecture-demo:update",state:JSON.stringify(value)},"*")}};addEventListener("message",event=>{if(event.source!==parent||event.data?.type!=="lecture-demo:state")return;try{state=JSON.parse(event.data.state);for(const fn of listeners)fn(state);if(initialized&&!failed)send("lecture-demo:rendered")}catch{fail()}});addEventListener("DOMContentLoaded",()=>{initialized=true;if(!failed)send("lecture-demo:ready")},{once:true})})();</script>`;
  const injected = parseFragment(
    `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${demoContentCsp}">${viewport ? "" : '<meta name="viewport" content="width=device-width,initial-scale=1">'}${title ? "" : "<title>Interactive demonstration</title>"}${bootstrap}`,
  ).childNodes;
  for (const node of injected) node.parentNode = head;
  head.childNodes.unshift(...injected);
  return serialize(document);
}
