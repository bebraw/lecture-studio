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
export { demoDocument } from "../shared/demo-document.ts";
export { validateDemoState } from "../shared/web-demo.ts";
