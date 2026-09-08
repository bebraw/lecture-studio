import MarkdownIt from "markdown-it";
import { posix } from "node:path";
import { scope } from "./narrative.mjs";

export function scopedPath(value) {
 if (typeof value !== "string" || value.includes("\\") || value.includes("\0")) throw new Error("Invalid note path");
 const path = posix.normalize(value);
 if (!path.startsWith(scope + "/") || value.split("/").includes("..")) throw new Error("Only the lecture folder is available");
 return path;
}
export function sections(markdown) {
 const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
 const title = body.match(/^# (.+)$/m)?.[1] ?? "Lecture material";
 const matches = [...body.matchAll(/^## (.+)$/gm)];
 if (!matches.length) return { title, sections: [{ heading: "Note", body: body.replace(/^# .+\n/, "").trim() }] };
 return { title, sections: matches.map((match, i) => ({ heading: match[1], body: body.slice(match.index + match[0].length, matches[i + 1]?.index ?? body.length).trim() })) };
}
export function renderMarkdown(value, { allowRemoteImages = false } = {}) {
 const md = new MarkdownIt({ html: false, linkify: false, typographer: true });
 md.validateLink = url => /^https:\/\//i.test(url);
 const escape = md.utils.escapeHtml;
 md.renderer.rules.image = (tokens, index) => {
   const token = tokens[index], src = token.attrGet("src") ?? "", alt = escape(token.content || "Source image");
   if (allowRemoteImages && /^https:\/\//i.test(src)) return '<img referrerpolicy="no-referrer" src="' + escape(src) + '" alt="' + alt + '">';
   return '<span class="image-notice">Image: ' + alt + ' · remote loading is off</span>';
 };
 const baseLink = md.renderer.rules.link_open;
 md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
   tokens[idx].attrSet("target", "_blank"); tokens[idx].attrSet("rel", "noopener noreferrer");
   return baseLink ? baseLink(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
 };
 const text = String(value).replace(/!?\[\[([^\]]+)\]\]/g, (_all, target) => {
   const label = target.split("|").at(-1).split("/").at(-1);
   return label.replace(/[<>*_\[\]]/g, "");
 });
 return md.render(text);
}
export function validateDraft(value) {
 if (!value || typeof value !== "object") throw new Error("A stage draft is required");
 const fields = { act: 40, mode: 20, title: 200, body: 16000, source: 500, diagram: 20, demoUrl: 2048 };
 const result = {};
 for (const [key, max] of Object.entries(fields)) {
   if (typeof value[key] !== "string" || value[key].length > max) throw new Error("Invalid stage " + key);
   result[key] = value[key];
 }
 if (!["question", "material", "diagram", "demo", "brief"].includes(result.mode)) throw new Error("Unknown stage mode");
 if (!["ages", "enhancement", "context", "futures"].includes(result.diagram)) throw new Error("Unknown diagram");
 result.allowRemoteImages = value.allowRemoteImages === true;
 return result;
}
export function publicStage(draft, version, brief = "") {
 return { act: draft.act, mode: draft.mode, title: draft.title, html: renderMarkdown(draft.body, draft),
 source: draft.source, diagram: draft.diagram, demoUrl: draft.demoUrl, version, brief };
}
