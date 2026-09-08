import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { scope } from "./narrative.mjs";
import { scopedPath, sections } from "./material.mjs";

export async function readCodexConfig() {
 try { return parse(await readFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "config.toml"), "utf8")); }
 catch (error) { if (error.code === "ENOENT") return {}; throw new Error("Cannot read Codex configuration"); }
}
export function connectionConfig(config, env = process.env) {
 const entry = config.mcp_servers?.obsidian ?? {};
 const url = new URL(env.OBSIDIAN_MCP_URL || entry.url || "http://127.0.0.1:27200/mcp/");
 if (!["http:", "https:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error("Obsidian must use a credential-free loopback MCP URL");
 const tokenName = entry.bearer_token_env_var || "OBSIDIAN_API_KEY";
 const token = env[tokenName];
 if (entry.bearer_token_env_var && !token) throw new Error("Obsidian needs its configured token in the launching environment");
 return { url, headers: token ? { Authorization: "Bearer " + token } : {} };
}
function payload(result) {
 if (result.isError) throw new Error("Obsidian rejected the scoped read");
 if (result.structuredContent) return result.structuredContent;
 const text = (result.content ?? []).filter(x => x.type === "text").map(x => x.text).join("\n");
 try { return JSON.parse(text); } catch { return text; }
}
export class ObsidianLibrary {
 client; connecting; status = "Not connected";
 async connect() {
   if (this.client) return this.client;
   if (this.connecting) return this.connecting;
   this.connecting = (async () => {
     const cfg = connectionConfig(await readCodexConfig());
     const client = new Client({ name: "lecture-studio", version: "0.1.0" });
     const transport = new StreamableHTTPClientTransport(cfg.url, { requestInit: { headers: cfg.headers }, fetch: (url, init) => fetch(url, { ...init, redirect: "error" }) });
     try {
       await client.connect(transport, { timeout: 10000 });
       this.client = client; this.status = "Connected · read-only lecture folder";
       return client;
     } catch { await client.close().catch(() => {}); this.status = "Unavailable"; throw new Error("Obsidian is unavailable. Open the vault and check the MCP endpoint and token environment."); }
   })();
   try { return await this.connecting; } finally { this.connecting = undefined; }
 }
 async call(name, args) {
   const client = await this.connect();
   try { return payload(await client.callTool({ name, arguments: args }, undefined, { timeout: 15000 })); }
   catch { this.status = "Read failed"; throw new Error("Obsidian read failed. Check the connection; the projected stage has not changed."); }
 }
 async list() {
   const result = await this.call("list_vault_files", { directory: scope, limit: 200 });
   const files = Array.isArray(result) ? result : result.files;
   if (!Array.isArray(files)) throw new Error("Unexpected Obsidian file-list response");
   return files.filter(p => typeof p === "string" && p.startsWith(scope + "/") && p.endsWith(".md")).map(p => ({ path: scopedPath(p), label: p.slice(scope.length + 1).replace(/\.md$/, "") }));
 }
 async read(path) {
   const safe = scopedPath(path);
   if (!safe.endsWith(".md")) throw new Error("Choose a Markdown note");
   const result = await this.call("get_vault_file", { path: safe, format: "text" });
   const content = typeof result === "string" ? result : result.content;
   if (typeof content !== "string" || content.length > 150000) throw new Error("Note is missing or too large for the stage");
   return { path: safe, ...sections(content) };
 }
 async close() { await this.client?.close().catch(() => {}); this.client = undefined; }
}
