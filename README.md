# Lecture Studio

## Live broadcast and deployment

### Private audience responses

The header's **Responses** menu opens either questions or a word collection,
independently of voting. Students submit from a collapsible form below their
shared stage. Nothing submitted is automatically published or sent to Codex.

- **Discuss** projects one selected question; **Back to slide** restores the
  previous projection. **Done** removes an item from the pending review list.
- For words, **Approve** admits individual responses to the cloud.
  **Show approved cloud** publishes a frozen snapshot of approved responses only.
  Repeated terms are combined case-insensitively; the 40 most frequent approved
  terms are shown with counts. New submissions require another review and show.
- **Close collection** stops submissions without removing responses.
  **Open new collection** replaces the old queue after confirmation. Live off
  also closes collection. No votes are affected.

Limits: 400 characters per question; 1–3 words / 32 characters per cloud response;
20 seconds between submissions and five per anonymous browser per collection;
120 submissions per minute per hashed network address; 500 total per collection.
Cookies and network limits deter casual flooding, not determined abuse. The
shared-network allowance accommodates a classroom behind one network.
No names or raw IP addresses are stored. The queue and hashed limiter data expire
after 24 hours; already projected snapshots remain until you change the stage.
Cloudflare's storage recovery window may retain recoverable data beyond deletion.

Run `node --import tsx audience/check-feedback.ts` against an isolated Worker on port 8796
for the local-only acceptance test. It never targets the public lecture.

Students join at **https://live.scalableweb.dev**. The projected stage keeps this
address in its footer on every slide, alongside attribution and build progress.
Use this origin for `LECTURE_POLL_ORIGIN` so the desk's links and polls match.
The custom domain is managed in the Cloudflare dashboard on the existing audience
Worker; the main scalableweb.dev site is unchanged.

The header's **Live** control is server-owned. Live off clears the public student
view to “Waiting for the lecturer”; browsing slides remains private. Live on
immediately broadcasts the selected slide. Close any open vote before turning
Live off. If the audience service cannot confirm the update, the desk reports an
error rather than claiming the broadcast stopped. Reloading a desk does not
change Live state; restarting the local server starts with Live off.

Pushes to main run unit tests and focused presentation browser tests, then deploy
only the public audience Worker through GitHub Actions. The local studio, Obsidian
and Codex integrations remain local. Manual runs are also available in Actions.
The target is `lecture-votes-20260909-bfbeb2745cce` in account
`3118f9560af77a0819ba24e1a14bcc9e`. Deployment preserves the existing presenter
secret and room data; it never seeds, resets, or submits votes.

GitHub needs the repository secret `CLOUDFLARE_API_TOKEN`, scoped to this
Cloudflare account with Workers Scripts Write and Account Settings Read.
The current credential expires September 10, 2027; rotate it before then.
Do not put this token or the separate presenter token in the repository.

The sections below include historical prototype workflows; the Live control
above supersedes the old Prepare/Present switching behavior.

Present mode uses a single ordered lecture sequence: title, opening question, then the historical and future discussion slides. **Previous slide** and **Next slide** publish immediately and synchronize the related cue/material. Previous at the beginning shows the opening title. These controls never start a build. There is no separate Show current slide button or audience-slide dropdown. Prepare-mode plot browsing remains private.

## Curated projection cards

Present mode offers two predefined cards per cue, with no search field. Prepare mode retains search and shortcut configuration. Only sections named `Slide: Definition`, `Slide: Image`, or `Slide: Quote` are eligible in Explore. Use `Presenter cue` for private discussion guidance and `Source` for projected attribution. Definitions are paraphrases, not quotations; quotes must be exact and attributed.

The vault's `Lectures/Web Development 2026/Projection/` folder contains the initial definition/diagram pairs. Original research notes remain unchanged. Diagrams use Mermaid; remote raster images remain blocked by the existing image policy. Custom card mappings use a new browser storage key, preserving older shortcut settings without using them in Present.

A local rehearsal prototype for a discussional lecture: **one capability, three ages**.

The private desk brings together a seven-beat plot, read-only Obsidian material, a projection draft, and a local Codex connection. A separate stage window shows only material you explicitly publish and a generic build-status label.

The design is deliberately editorial: large serif headings, restrained color, simple mechanism graphics. The stage is not a mirror of the coding console.

## Start here

Requirements: Node.js 24+, an authenticated Codex CLI on PATH, and Obsidian with your existing local MCP endpoint available. Dependencies are already installed in this checkout.

Codex CLI **0.153.4** is confirmed working by the lecturer. This is a tested version, not a claimed minimum.

## Prepare and Present

Present has one **On stage** panel reflecting published content, not the private draft. Blank state, prompts, graphics and audience counts follow the projection. For a live app it shows the selected URL instead of opening a second interactive app instance. The editable **Material draft · Private** preview is shown only in Prepare or Find something.

The desk opens in **Present**, remembering your choice per browser tab. Use **Prepare** for the full library, material editing, model selection, and saving/restoring drafts.

Present keeps the published title, selected private discussion cue, preview, brief, and build controls visible. **Previous cue / Next cue** browse without changing the stage; **Show this question** immediately publishes the selected question in one click. No separate drafting step is needed for cues, and no coding prompt is sent. Obsidian material can still be edited and published through **Find something…**.

**Find something…** temporarily reveals the library and draft editors. Press Escape or **Done** to return. Switching modes preserves your editors and ongoing Codex connection.

Both windows show observed activity and elapsed build time, not estimated percentages. The stage uses only allowlisted activity labels, never commands, paths, or approval text. Finished means the turn ended, not that the result has been certified. There is no verification checkbox. The optional change-summary reveal is not implemented.

```sh
cd "/Users/juhovepsalainen/Projects/lecture-studio"
npm start
```

Open the **Private desk** link printed by the server. Keep that link and window private. Use **Open projected stage** for the projector, ideally on a separate display rather than screen mirroring. The stable /desk and /stage URLs load their own role-specific authorization from the loopback server. Bookmark either URL; reloading after a server restart refreshes authorization.

The implementation checkout is a fresh sibling folder:

```text
../lecture-studio
```

It starts at [lecture-start-v10](https://github.com/bebraw/webdev-through-ages/tree/lecture-start-v10), commit `6a5dae4e7bf7b0b510c525a91497cd6620869bbc`, on branch `rehearsal-studio`. Dependencies are installed. No implementation turn has been sent, and no application has been deployed.

Optional settings are documented in [.env.example](.env.example). Create your own .env if needed; do not commit credentials. The default port is 4317. LECTURE_CODEX_BIN can select the installed Codex executable explicitly. No global Codex settings are modified.

## A ten-minute rehearsal

1. Open the desk and stage side by side. Move the stage to the projected display.
2. Open **Connections** in the header and connect Obsidian. Select a concept, then its **Stage block** or **Visual** section. Reading it does not project it. The header shows both service statuses; note exploration also connects Obsidian automatically.
3. Use the section in the draft. Edit it, then press **Show this to the room**. Try blanking and unblanking the stage.
4. Browse the discussion cues. This changes only the private selection. Use **Use cue’s build prompt** when you want its suggested build brief.
5. Open **Connections**, then **Connect Codex**. This starts the local bridge and reads the model list; it does not send a model prompt. The same panel holds Codex disconnect and the rehearsal workspace. Escape or clicking outside closes it.
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

## Audience votes shape the prompt

In **Prepare → Audience vote**, define a question, 2–6 options (`id|label` per line), and a default. In Present, the same collapsible section offers **Open vote**, **Show vote on stage**, **Close vote**, and **Add result to prompt**. Open does not automatically project; adding does not automatically send. Counts refresh while the desk is connected. Close locks the room and captures an immutable aggregate revision.

The selected result and counts are inserted as labeled reference data into the editable prompt. Zero votes use the prepared default. Ties use the default if it is tied, otherwise the first tied option in prepared order. The rule is visible, not presented as audience consensus. No later refresh can modify the frozen receipt. Save draft/Restore draft also store the poll definition, but never its credentials.

### Public app setup required

This is an adapter to the existing lecture room API, not a second public voting service. Set `LECTURE_POLL_ORIGIN`, `LECTURE_POLL_ROOM` (default `webdev-2026`), and `LECTURE_POLL_TOKEN` in the studio launching environment; restart the studio. The token must match the public app's `PRESENTER_TOKEN`. It stays server-side and is stripped from the Codex child environment. The join URL is always the public app's `/rooms/{room}` URL, never a studio capability URL.

The public app must already expose:

- `GET /api/rooms/{room}`: `{status:"open"|"locked", revision, totalVotes, choices:[{id,label,votes}]}`.
- Authenticated `POST /presenter/rooms/{room}/open-session` with an `X-Lecture-Session` header, and `.../lock`, returning that same aggregate. A new session clears previous votes atomically on opening; retrying or reopening the same session preserves them.
- `GET /rooms/{room}`: the audience's native form, posting back to the room. Keep its existing same-origin checks, predefined-choice validation, and replaceable anonymous vote semantics.

For the default theme poll, seed the public app with exactly `editorial|Editorial`, `retro-web|Retro web`, and `playful|Playful` in a designated rehearsal room. **The pinned starter currently seeds seminar interests, not these themes.** Configure the app's choices first, or configure the studio to match its existing interests. The studio checks IDs and labels before opening or locking and refuses a mismatch; it never seeds choices. Loading/restarting a presentation, resetting the lecture, or restarting the server creates a fresh voting session.

Reuse the audience join link/your existing QR. Closing the poll must succeed before a result can be used; failures display an error and retain last-known counts. Resetting the lecture is refused while a known vote is open. A studio restart does not close the public room. Cookie-based deduplication is a convenience, not strong identity or protection against determined multiple voting; retain the public app's anti-abuse controls.

Tests cover the full studio flow with a simulated room, including explicit projection, freezing, ties, defaults and mismatch refusal. A live public-room rehearsal remains necessary after configuration.

## Showing prompts

**Show prompt to the room** projects the editable prompt without sending it. **Send to Codex** remains separate. After a successful submission, **Show exact prompt sent** projects the stored submitted text, even if the next prompt has been edited. Prompt text is displayed literally, without Markdown interpretation. Failed submissions do not replace that snapshot.

**Back to material** restores the material from before the prompt/app detour. Projecting a prompt does not overwrite your unpublished material draft.

## Preview shortcuts

Local preview URLs in Codex's current response appear as a contextual shortcut on the private desk. Choose a URL when there are several, then **Open privately** or **Show on stage**. Detection does not fetch the URL or change the projection. **Back to material** restores the material that was on stage before the preview; unpublished draft edits stay intact.

Links are labeled as agent-supplied and not checked for availability. This first pass detects explicit localhost/127.0.0.1/IPv6-loopback URLs with ports, excluding studio-port aliases, API/debug paths, and links containing credentials, queries, or fragments. Public deployment URLs can still be entered manually through the Live app surface. Iframe availability and hot reload depend on the app's own development server.

## Obsidian workflow

### Explore this idea

Present includes contextual shortcuts and an inline full-text search under the stage panel. Shortcuts follow the selected discussion cue, not the current projection or build status. Opening suggestions include early web, client/server, HTTP and the prepared project. Some shortcuts open a specific note/section; others run a topic search.

Select a search result or shortcut to read privately, choose a section, then **Show this excerpt** to publish. Reading, searching, and changing cues never send content to Codex or automatically change the stage. Markdown is rendered with the same restrictions as the existing library; remote images remain disabled when publishing an excerpt.

In Prepare, expand **Customize shortcuts for this cue**. Each line is `Label | relative note path | optional section`; use `?server` in place of a path for a search shortcut. Up to six mappings per cue are stored in this browser's local storage, not in Obsidian or Git. Restore defaults removes the override for the selected cue.

Search indexes only the configured lecture folder, using four concurrent reads on the first search. It matches all query words across the note title, section title, and body, returning at most 20 sections. The index stays in server memory; reconnecting the library through **Connect Obsidian**, or restarting the studio, clears it. Unavailable notes are reported; no extra model call is used.

Restart the studio after this update to load the new search route and browser module.

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

The bridge requests workspace-write and routes on-request approvals to Codex’s automatic reviewer (approvalsReviewer: auto_review). Routine build permission requests no longer wait for presenter clicks; the reviewer can approve or deny them. This requires a CLI supporting automatic review (verified against 0.154.0). Restart the studio and reconnect Codex after changing this policy. It disables configured MCP connectors and plugins **for this child process**, and removes Obsidian token variables from its environment. Your normal project instructions and applicable Codex policies still apply. This is context minimization, **not** an OS-level guarantee that the vault is unreadable: Codex’s configured sandbox/read access and existing hooks still matter.

If Codex still forwards a command/file request to the desk, it supports approval once or decline. Structured questions support answers. Broad permission requests and unsupported request types are not granted. The wrapper does not weaken environment-level restrictions or automatically deploy.

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

Local bookmarks: http://127.0.0.1:4317/desk and http://127.0.0.1:4317/stage. The loopback-only server supplies role-specific authorization in each page; no URL token is needed. These pages are accessible to local users.

### Share a local build with the audience

With Live on, **Show on stage** starts an owned Cloudflare Quick Tunnel for the selected local app port. The audience page embeds the resulting HTTPS app; the local projector keeps the local URL. Opening a preview privately does not start a tunnel. Leaving the app for slides, turning Live off, resetting the lecture, or stopping the studio closes the tunnel. The app’s entire selected port is public while shared, including its form/API routes.

Install cloudflared (`brew install cloudflared` on macOS), or set LECTURE_CLOUDFLARED_BIN. A failed tunnel start is reported without replacing the projected slide. The studio’s own port cannot be tunneled. Students keep using https://live.scalableweb.dev; no audience Worker update is needed for this feature. Keep the app server and studio running. New tunnel hostnames may take time to appear in DNS; networks that block trycloudflare.com need an allowed network or a configured named tunnel.

Quick Tunnels are temporary demo infrastructure, with a 200 concurrent request limit and no Server-Sent Events support. Apps that prohibit iframe embedding can be opened through the separate app link. See [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

## TypeScript development

All maintained runtime code, browser modules, tests, and tools use TypeScript.
Oxlint rejects explicit `any` throughout maintained code and `unknown` in
`shared/models.ts`, where domain contracts must name their supported fields.
Keep `unknown` for unvalidated JSON, external protocol results, and caught errors;
narrow it before use. Do not replace it with an assertion merely to satisfy lint.
Callbacks whose results are ignored declare `void | Promise<void>`.

Run `npm ci` and `npm ci --prefix audience` before development.
`npm run typecheck` generates Worker bindings and checks both runtime environments
with strict typing, unused-code checks, complete returns, and switch-fallthrough checks.
`npm run build` compiles browser entry points into ignored `.local/browser` assets.
`npm start` and the browser tests build those assets automatically. Run standalone
TypeScript tools with `node --import tsx path/to/tool.ts`.

The development baseline is Node 24 (`nvm use`). Newer Node releases are allowed;
CI uses the baseline in `.nvmrc`. Dependency versions are pinned in both lockfiles.

- `npm run quality:gate:fast`: formatting, strict types, unit/integration tests,
  and production dependency audits (high/critical advisories fail the gate).
- `npm run check`: the fast gate, a non-deploying Worker build, and all browser tests.
- `npm run hooks:install`: install the repository's pre-push hook, which runs the
  fast gate. Run this once in each checkout after installing dependencies.

Pull requests and branch pushes run the full check. The production workflow runs
that same check before deploying the audience Worker. Browser tests use isolated
local fixtures and do not submit votes to the public lecture.

Additional checks:

- `npm run lint`: Oxlint, enforced in the fast gate.
- `npm run diagnostics:codebase`, `diagnostics:health`, `diagnostics:map`: advisory
  Fallow analysis; the map is written to `.fallow/codebase-map.html`.
- `npm run quality:architecture`: reject forbidden imports between runtime zones.
- `npm run test:coverage`: local-runtime branch coverage and reports in
  `reports/coverage/index.html`, enforced in the fast gate.
- `npm run mutation`: focused mutation analysis of voting, decisions and audience
  privacy; `npm run mutation:incremental` reuses prior results for explicit local runs.
  Reports are written to `reports/mutation/index.html`. Mutation is a separate CI
  job and is intentionally outside the pre-push gate.

TypeScript 7 remains the project compiler. The TypeScript 6 compatibility package
supplies the compiler API required by Stryker and its compile-error checker.
