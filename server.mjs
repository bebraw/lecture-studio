import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, extname, sep } from "node:path";
import { acts, initialDraft, scope } from "./lib/narrative.mjs";
import { validateDraft, publicStage, renderMarkdown } from "./lib/material.mjs";
import { ObsidianLibrary } from "./lib/obsidian.mjs";
import { CodexBridge } from "./lib/codex.mjs";

const root = dirname(fileURLToPath(import.meta.url));
export function safeEqual(a, b) {
 const left = Buffer.from(a), right = Buffer.from(b);
 return left.length === right.length && timingSafeEqual(left, right);
}
export function validDemoUrl(value, ownOrigin) {
 if (!value) return "";
 const url = new URL(value);
 if (url.username || url.password || url.search || url.hash || url.origin === ownOrigin ||
   !(url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))))
   throw new Error("Use a public HTTPS or loopback app URL without credentials, query, or fragment");
 return url.href;
}
async function readJson(request) {
 if (!request.headers["content-type"]?.startsWith("application/json")) throw new Error("Expected JSON");
 let size = 0; const chunks = [];
 for await (const chunk of request) { size += chunk.length; if (size > 100000) throw new Error("Request is too large"); chunks.push(chunk); }
 return JSON.parse(Buffer.concat(chunks).toString());
}
export function createStudio({ library = new ObsidianLibrary(), bridge = new CodexBridge(), workspace = resolve(root, "../webdev-rehearsal-studio"), port = 4317, host = "127.0.0.1", persist = true } = {}) {
 const deskToken = randomBytes(32).toString("hex"), stageToken = randomBytes(32).toString("hex");
 let origin, draft = initialDraft(), publishedDraft = initialDraft(), version = 1, blank = false, brief = acts[0].brief;
 let stage = publicStage(publishedDraft, version), lastBrief = "";
 let activeAct = "opening", libraryFiles = [], savedAt = null;
 let previousMaterial = null;
 const json = (res, value, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(value)); };
 const deskState = () => ({ acts, scope, draft, draftPreview: publicStage(draft, version), stage, blank, canReturnToMaterial: !!previousMaterial, activeAct, brief, lastBrief, codex: bridge.snapshot(), libraryStatus: library.status, workspace, savedAt });
 const publicState = () => {
   const c = bridge.state;
   const activity = ["Running a command", "Editing files", "Using a tool", "Looking up a source", "Responding", "Working"].includes(c.activity) ? c.activity : "Working";
   return { ...stage, blank, build: { activity, status: c.status, outcome: ["completed", "failed", "interrupted"].includes(c.outcome) ? c.outcome : null, startedAt: c.startedAt || null, finishedAt: c.finishedAt || null } };
 };
 const server = createServer(async (req, res) => {
   res.setHeader("cache-control", "no-store");
   res.setHeader("referrer-policy", "no-referrer");
   res.setHeader("x-content-type-options", "nosniff");
   res.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-src http://127.0.0.1:* http://localhost:* https:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
   try {
     if (req.headers.host !== new URL(origin).host) return json(res, { error: "Host not allowed" }, 403);
     if (req.headers.origin && req.headers.origin !== origin) return json(res, { error: "Origin not allowed" }, 403);
     if (req.headers["sec-fetch-site"] === "cross-site") return json(res, { error: "Cross-site request rejected" }, 403);
     const url = new URL(req.url, origin);
     if (url.pathname.startsWith("/api/")) {
       const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
       const isDesk = safeEqual(token, deskToken), isStage = safeEqual(token, stageToken);
       if (!isDesk && !(isStage && url.pathname === "/api/stage" && req.method === "GET")) return json(res, { error: "This window is not authorized" }, 401);
       if (req.method === "GET") {
         if (url.pathname === "/api/desk") return json(res, deskState());
         if (url.pathname === "/api/stage") return json(res, publicState());
         if (url.pathname === "/api/stage-link") return json(res, { url: origin + "/stage#" + stageToken });
         if (url.pathname === "/api/library") { libraryFiles = await library.list(); return json(res, { files: libraryFiles }); }
         if (url.pathname === "/api/note") {
           const path = url.searchParams.get("path");
           if (!libraryFiles.some(file => file.path === path)) throw new Error("Select a note from the lecture library first");
           const note = await library.read(path);
           return json(res, { ...note, sections: note.sections.map(section => ({ ...section, html: renderMarkdown(section.body) })) });
         }
         return json(res, { error: "Not found" }, 404);
       }
       if (req.method !== "POST" || req.headers.origin !== origin) return json(res, { error: "Same-origin POST required" }, 403);
       const body = await readJson(req);
       if (url.pathname === "/api/draft") {
         draft = validateDraft(body); draft.demoUrl = validDemoUrl(draft.demoUrl, origin);
       } else if (url.pathname === "/api/act") {
         if (!acts.some(a => a.id === body.act)) throw new Error("Unknown narrative beat");
         activeAct = body.act;
       } else if (url.pathname === "/api/publish") {
         const next = validateDraft(body); next.demoUrl = validDemoUrl(next.demoUrl, origin);
         draft = next; publishedDraft = { ...next }; stage = publicStage(publishedDraft, ++version, stage.brief); blank = false;
       } else if (url.pathname === "/api/show-preview") {
         if (typeof body.url !== "string" || body.url.length > 2048) throw new Error("Invalid preview URL");
         const demoUrl = validDemoUrl(body.url, origin);
         if (!demoUrl) throw new Error("Choose a preview URL");
         if (publishedDraft.mode !== "demo") previousMaterial = { ...publishedDraft };
         publishedDraft = { ...initialDraft(), act: activeAct, mode: "demo", title: "Live app · work in progress", body: "", demoUrl, source: "Agent-supplied preview · selected by the lecturer" };
         stage = publicStage(publishedDraft, ++version); blank = false;
       } else if (url.pathname === "/api/back-material") {
         if (!previousMaterial) throw new Error("No previous material");
         publishedDraft = previousMaterial; previousMaterial = null;
         stage = publicStage(publishedDraft, ++version); blank = false;
       } else if (url.pathname === "/api/blank") { blank = body.blank === true;
       } else if (url.pathname === "/api/brief") {
         if (typeof body.brief !== "string" || body.brief.length > 20000) throw new Error("Brief is too long");
         brief = body.brief;
       } else if (url.pathname === "/api/publish-brief") {
         if (typeof body.brief !== "string" || body.brief.length > 20000) throw new Error("Brief is too long");
         brief = body.brief;
         draft = { ...draft, mode: "brief", title: "Here is what we are asking.", body: brief, source: "Reviewed build brief · selected by the lecturer" };
         publishedDraft = { ...draft }; stage = publicStage(publishedDraft, ++version, brief); blank = false;
       } else if (url.pathname === "/api/codex/connect") {
         await bridge.connect(workspace);
       } else if (url.pathname === "/api/codex/start") {
         if (typeof body.brief !== "string" || !body.brief.trim() || body.brief.length > 20000) throw new Error("Review a non-empty brief first");
         lastBrief = body.brief; brief = body.brief;
         await bridge.start(body.brief, body.model || "");
       } else if (url.pathname === "/api/codex/interrupt") { await bridge.interrupt();
       } else if (url.pathname === "/api/codex/disconnect") { bridge.close();
       } else if (url.pathname === "/api/codex/answer") { bridge.answer(body.id, body.decision, body.answers);
       } else if (url.pathname === "/api/restore") {
         if (!persist) throw new Error("Saving is disabled in test mode");
         const saved = JSON.parse(await readFile(resolve(root, ".local/session.json"), "utf8"));
         const next = validateDraft(saved.draft); next.demoUrl = validDemoUrl(next.demoUrl, origin);
         if (typeof saved.brief !== "string" || saved.brief.length > 20000) throw new Error("Invalid saved brief");
         draft = next; brief = saved.brief;
         activeAct = acts.some(a => a.id === saved.activeAct) ? saved.activeAct : "opening";
         savedAt = saved.savedAt;
         // Restoring a private draft must never restore the projected screen or run an agent.
       } else if (url.pathname === "/api/save") {
         if (!persist) throw new Error("Saving is disabled in test mode");
         await mkdir(resolve(root, ".local"), { recursive: true, mode: 0o700 });
         savedAt = new Date().toISOString();
         await writeFile(resolve(root, ".local/session.json"), JSON.stringify({ savedAt, activeAct, draft, publishedDraft, brief, lastBrief }, null, 2), { mode: 0o600 });
       } else return json(res, { error: "Not found" }, 404);
       return json(res, deskState());
     }
     if (req.method !== "GET") return json(res, { error: "Method not allowed" }, 405);
     let path;
     const staticFiles = { "/": "desk.html", "/desk": "desk.html", "/stage": "stage.html", "/style.css": "style.css", "/desk.mjs": "desk.mjs", "/stage.mjs": "stage.mjs", "/shared.mjs": "shared.mjs" };
     if (staticFiles[url.pathname]) path = resolve(root, "public", staticFiles[url.pathname]);
     else if (url.pathname.startsWith("/vendor/mermaid/")) {
       const vendorRoot = await realpath(resolve(root, "node_modules/mermaid/dist"));
       path = await realpath(resolve(vendorRoot, decodeURIComponent(url.pathname.slice("/vendor/mermaid/".length))));
       if (!path.startsWith(vendorRoot + sep) || ![".mjs", ".js", ".woff2"].includes(extname(path))) return json(res, { error: "Not found" }, 404);
     } else return json(res, { error: "Not found" }, 404);
     const content = await readFile(path);
     const type = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".woff2": "font/woff2" }[extname(path)];
     res.writeHead(200, { "content-type": type }); res.end(content);
   } catch (error) {
     json(res, { error: String(error.message || "Request failed").slice(0, 2000) }, 400);
   }
 });
 server.on("close", () => { bridge.close(); void library.close(); });
 return { server, bridge, library, async start() {
   await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
   origin = "http://" + host + ":" + server.address().port;
   return { origin, deskUrl: origin + "/desk#" + deskToken, stageUrl: origin + "/stage#" + stageToken, deskToken, stageToken };
 }};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const studio = createStudio({ port: Number(process.env.LECTURE_PORT || 4317), workspace: resolve(root, process.env.LECTURE_WORKSPACE || "../webdev-rehearsal-studio") });
 const address = await studio.start();
 console.log("Lecture Studio · local only\nPrivate desk: " + address.deskUrl + "\nProject only: " + address.stageUrl + "\nCodex implementation starts only when you send a brief.");
 for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { studio.bridge.close(); studio.server.close(); studio.server.closeAllConnections(); void studio.library.close().finally(() => process.exit(0)); });
}
