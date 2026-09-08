# Lecture Studio

A local rehearsal prototype for a discussional lecture: **one capability, three ages**.

The private desk brings together a seven-beat plot, read-only Obsidian material, a projection draft, and a local Codex connection. A separate stage window shows only material you explicitly publish and a generic build-status label.

The design is deliberately editorial: large serif headings, restrained color, simple mechanism graphics. The stage is not a mirror of the coding console.

## Start here

Requirements: Node.js 24+, an authenticated Codex CLI on PATH, and Obsidian with your existing local MCP endpoint available. Dependencies are already installed in this checkout.

Codex CLI **0.153.4** is confirmed working by the lecturer. This is a tested version, not a claimed minimum.

## Prepare and Present

The desk opens in **Present**, remembering your choice per browser tab. Use **Prepare** for the full library, material editing, model selection, and saving/restoring drafts.

Present keeps the published title, selected private discussion cue, draft preview, brief, and build controls visible. **Previous cue / Next cue** browse the plot without changing the stage; **Draft this question** prepares the selected question; **Show this to the room** publishes it. None of these sends a coding prompt.

**Find something…** temporarily reveals the library and draft editors. Press Escape or **Done** to return. Switching modes preserves your editors and ongoing Codex connection.

Both windows show observed activity and elapsed build time, not estimated percentages. The stage uses only allowlisted activity labels, never commands, paths, or approval text. Finished means the turn ended, not that the result has been certified. There is no verification checkbox. The optional change-summary reveal is not implemented.

```sh
cd "/Users/juhovepsalainen/.codex/visualizations/2026/09/03/01a06689-0610-72c3-a04c-c133d728b75f/lecture-studio"
npm start
```

Open the **Private desk** link printed by the server. Keep that link and window private. Use **Open projected stage** for the projector, ideally on a separate display rather than screen mirroring. The two links carry different access tokens; they change whenever the server restarts.

The implementation checkout is a fresh sibling folder:

```text
../webdev-rehearsal-studio
```

It starts at [lecture-start-v10](https://github.com/bebraw/webdev-through-ages/tree/lecture-start-v10), commit `6a5dae4e7bf7b0b510c525a91497cd6620869bbc`, on branch `rehearsal-studio`. Dependencies are installed. No implementation turn has been sent, and no application has been deployed.

Optional settings are documented in [.env.example](.env.example). Create your own .env if needed; do not commit credentials. The default port is 4317. LECTURE_CODEX_BIN can select the installed Codex executable explicitly. No global Codex settings are modified.

## A ten-minute rehearsal

1. Open the desk and stage side by side. Move the stage to the projected display.
2. Connect Obsidian. Select a concept, then its **Stage block** or **Visual** section. Reading it does not project it.
3. Use the section in the draft. Edit it, then press **Show this to the room**. Try blanking and unblanking the stage.
4. Browse the discussion cues. This changes only the private selection. Use **Use cue’s build prompt** when you want its suggested build brief.
5. Open **Rehearsal connection**, then **Connect Codex**. This starts the local bridge and reads the model list; it does not send a model prompt.
6. Freestyle the opening brief with the audience. **Project brief** exposes the exact text you are discussing; **Send to Codex** separately starts implementation.
7. Keep talking while Codex works. Approvals and agent responses appear only on the private desk. Show and discuss the result without a separate verification checkbox.
8. When the agent has provided a preview URL, choose **Live app**, paste the URL, and publish. The wrapper does not start the app server automatically.

Start with the opening prompt, which asks for defaults and discussion without implementation. The later prompts are suggestions, not hidden context. Existing project instructions still apply.

## Resetting and starting fresh

In **Prepare**, the Rehearsal controls offer:

- **Reset lecture…** clears the unsaved draft, brief, projection, preview shortcuts and Codex conversation, returning to the opening. The current project files, Obsidian notes and saved material are retained.
- **New rehearsal…** creates a numbered folder under ignored `.local/rehearsals/`, clones `lecture-start-v10`, verifies its pinned commit, installs dependencies and selects the new checkout. Existing checkouts are never reset, cleaned or deleted. Failed setup leaves the active rehearsal unchanged and retains the attempted folder for inspection.

Both actions ask for confirmation. Fresh setup runs in the background; progress appears in Prepare. The latest successfully created checkout is remembered across server restarts. Dependency installation needs network access and a compatible Node/npm runtime. Saved draft restoration does not select an old project.

On macOS/Linux, disconnect/reset signals the process group launched by this studio, including preview children that remain in that group. Independently launched or daemonized servers cannot safely be identified and are not killed; stop those yourself. Windows cleanup stops the direct Codex child only. These process-group changes apply to sessions launched after restarting the updated studio.

Restart the studio once after installing this update to activate the new reset endpoints.

## Preview shortcuts

Local preview URLs in Codex's current response appear as a contextual shortcut on the private desk. Choose a URL when there are several, then **Open privately** or **Show on stage**. Detection does not fetch the URL or change the projection. **Back to material** restores the material that was on stage before the preview; unpublished draft edits stay intact.

Links are labeled as agent-supplied and not checked for availability. This first pass detects explicit localhost/127.0.0.1/IPv6-loopback URLs with ports, excluding studio-port aliases, API/debug paths, and links containing credentials, queries, or fragments. Public deployment URLs can still be entered manually through the Live app surface. Iframe availability and hot reload depend on the app's own development server.

## Obsidian workflow

The adapter reads only Markdown files under:

```text
Lectures/Web Development 2026
```

It reuses the `mcp_servers.obsidian` URL and bearer-token environment variable from the normal Codex configuration. The default endpoint is loopback port 27200. Keep Obsidian running. A terminal launching this app needs the configured token in its environment; the fact that an editor has the token does not necessarily mean a new terminal does.

Only list and read operations are exposed. There is no vault-write endpoint. Full notes stay on the desk. **Add selected excerpt** copies only the selected section into the editable brief, labeled as reference data. Review it before sending.

Mermaid diagrams render locally. Raw HTML is not executed. Remote HTTPS images are off unless explicitly enabled for a draft; enabling them contacts the image host. Obsidian wiki-links remain readable labels, but embedded local vault images/canvas files are not supported yet. Use the built-in graphics, Mermaid, or an explicitly allowed remote image for this first pass.

**Save draft** stores selected draft material and brief text in ignored `.local/session.json`. **Restore draft** restores only private state; it never changes the projection or starts a build. Raw agent output, access tokens, and the full vault are not saved there.

## Implementation boundary

The Node proxy starts `codex app-server` over local stdio. Codex uses its existing login and a remote model; this is not an offline LLM. Model choices come from the installed CLI.

Each connection starts a new conversation when the first brief is sent. Subsequent briefs share that conversation. A disconnect/reconnect does not resume it. Only one turn can run at a time. A timeout is not automatically retried.

The bridge requests workspace-write and on-request approvals. It disables configured MCP connectors and plugins **for this child process**, and removes Obsidian token variables from its environment. Your normal project instructions and applicable Codex policies still apply. This is context minimization, **not** an OS-level guarantee that the vault is unreadable: Codex’s configured sandbox/read access and existing hooks still matter.

Command/file requests support approval once or decline. Structured questions support answers. Broad permission requests and unsupported request types are not granted. The wrapper does not weaken environment-level restrictions or automatically deploy.

The private desk uses a per-run capability token. The stage token can only read published state, not notes, briefs, or Codex controls. Exact Host/Origin checks, loopback binding, and no CORS help keep web pages from driving the local bridge. This is a single-presenter prototype, not a remotely hosted multi-user service. Do not tunnel or expose its port.

## Tests and verification

```sh
npm run check
```

This runs unit/integration tests plus a Chromium rehearsal. If the matching Playwright browser is unavailable on another machine, run `npx playwright install chromium` first.

Verified here:
- live scoped Obsidian listing and section retrieval;
- live Codex handshake and model listing, with no thread or turn created;
- mock-protocol turn creation, exact prompt handoff, approval handling, and one-active-turn behavior;
- browser selection → private draft → explicit projection, Mermaid rendering, blanking, and private approvals;
- stage-token restrictions, cross-origin rejection, note-path boundaries, and safe Markdown rendering.

**Not yet verified:** a real model-driven implementation through this wrapper, a deployed audience session, or long lecture-duration use. Those are the next rehearsal, not implied by a passing mock test.

Known first-pass limits: one presenter, one fixed rehearsal checkout, one active build, no thread resume/history UI, no embedded terminal/diff viewer, no completion sound, and no offline vault snapshot. Use your editor for code inspection. Some sites disallow iframe embedding; **Open app separately** is the fallback. Long text can still make an overcrowded stage; select short sections.

## Reference implementation

The local companion architecture is informed by [Kirjolab at ac72a526](https://github.com/bebraw/kirjolab/tree/ac72a52670c537a4f468f994f4ed6ba855392733), especially its Codex backend and ADR-234. Its tool-free generation backend is not copied: this prototype needs implementation tools and interactive approvals, so it uses the [official Codex app-server protocol](https://learn.chatgpt.com/docs/app-server).

The local browser wrapper is intentionally independent of the audience app. Electron packaging can wait until rehearsal shows a reason for it.
