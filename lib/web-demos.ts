import { randomUUID } from "node:crypto";
import { posix } from "node:path";
import type {
  Library,
  PresentationDefinition,
  WebDemo,
} from "../shared/models.ts";
import { scopedPath } from "./material.ts";

export interface LoadedDemo {
  html: string;
  view: WebDemo;
}
export async function loadWebDemos(
  definition: PresentationDefinition,
  path: string,
  library: Library,
) {
  const demos = new Map<string, LoadedDemo>();
  for (const step of definition.steps) {
    if (!step.demo) continue;
    if (
      step.type !== "material" ||
      step.previewOf ||
      step.teachingDemo ||
      step.layersDemo
    )
      throw new Error(
        "HTML demos require a material slide without another demo setting",
      );
    if (!library.readHtml)
      throw new Error("This library cannot read HTML demos");
    const file = scopedPath(posix.join(posix.dirname(path), step.demo));
    const html = await library.readHtml(file);
    if (Buffer.byteLength(html, "utf8") > 250000)
      throw new Error("Demo exceeds 250 KB: " + file);
    const id = randomUUID();
    demos.set(step.id, {
      html,
      view: { id, url: "/slide-demo/" + id, state: "{}" },
    });
  }
  return demos;
}
export function validateDemoState(state: string) {
  if (Buffer.byteLength(state, "utf8") > 16000)
    throw new Error("Demo state exceeds 16 KB");
  const value: unknown = JSON.parse(state);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Demo state must be a JSON object");
  return JSON.stringify(value);
}
export function demoDocument(html: string, controller: boolean) {
  // This bootstrap executes before authored scripts, inside an opaque-origin sandbox.
  const bootstrap = `<script>(()=>{let state={},listeners=[];const role=${JSON.stringify(controller ? "controller" : "viewer")};window.LectureDemo={role,onState(fn){listeners.push(fn);fn(state)},setState(value){if(role==="controller")parent.postMessage({type:"lecture-demo:update",state:JSON.stringify(value)},"*")}};addEventListener("message",event=>{if(event.source!==parent||event.data?.type!=="lecture-demo:state")return;state=JSON.parse(event.data.state);for(const fn of listeners)fn(state)});parent.postMessage({type:"lecture-demo:ready"},"*")})();</script>`;
  return (
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
    bootstrap +
    html
  );
}
