import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, extname, sep } from "node:path";
import { acts, initialDraft, scope } from "./lib/narrative.mjs";
import { validateDraft, publicStage, renderMarkdown } from "./lib/material.mjs";
import { ObsidianLibrary } from "./lib/obsidian.mjs";
import { CodexBridge } from "./lib/codex.mjs";
import { Rehearsals } from "./lib/rehearsals.mjs";
import { AudiencePoll } from "./lib/audience-poll.mjs";
import { PreviewTunnel } from "./lib/preview-tunnel.mjs";
import { AudienceStageSync } from "./lib/audience-stage.mjs";
import { LectureSearch } from "./lib/lecture-search.mjs";
import { parsePresentation, PresentationSession } from "./lib/presentation.mjs";
import { feedbackRequest, feedbackSlide } from "./lib/feedback.mjs";

const root = dirname(fileURLToPath(import.meta.url));
export function safeEqual(a, b) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function validDemoUrl(value, ownOrigin) {
  if (!value) return "";
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.origin === ownOrigin ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    throw new Error(
      "Use a public HTTPS or loopback app URL without credentials, query, or fragment",
    );
  return url.href;
}
async function readJson(request) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new Error("Expected JSON");
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100000) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export function createStudio({
  library = new ObsidianLibrary(),
  bridge = new CodexBridge(),
  poll = new AudiencePoll(),
  previewTunnel = new PreviewTunnel(),
  workspace = resolve(root, "../lecture-studio"),
  rehearsals = new Rehearsals(resolve(root, ".local/rehearsals")),
  port = 4317,
  host = "127.0.0.1",
  persist = true,
} = {}) {
  if (!["127.0.0.1", "::1"].includes(host)) throw new Error("Lecture Studio must bind to loopback");
  const deskToken = randomBytes(32).toString("hex"),
    stageToken = randomBytes(32).toString("hex");
  const lectureSearch = new LectureSearch(library);
  const audienceSync = new AudienceStageSync(poll);
  let origin,
    draft = initialDraft(),
    publishedDraft = initialDraft(),
    version = 1,
    blank = false,
    brief = acts[0].brief;
  let stage = publicStage(publishedDraft, version),
    lastBrief = "";
  let activeAct = "opening",
    libraryFiles = [],
    savedAt = null;
  let previousMaterial = null;
  let feedbackPrevious = null;
  let rehearsalJob = { status: "idle" },
    resetVersion = 0;
  let pollOnStage = false,
    projectedPoll = null,
    pollResults = false,
    live = false,
    liveTransition = false;
  const waitingStage = () => ({
    ...publicStage(
      {
        ...initialDraft(),
        act: "",
        mode: "material",
        title: "Waiting for the lecturer",
        body: "",
        source: "",
      },
      String(version) + "-off",
    ),
    live: false,
    projectionKind: "waiting",
    blank: false,
    build: { status: "ready", startedAt: null, finishedAt: null },
  });
  let presentation = null,
    graphPoll = null,
    graphBusy = false;
  const graphPolls = new Map();
  const showGraph = () => {
    feedbackPrevious = null;
    const s = presentation.step();
    if (s.type === "poll") {
      if (!graphPolls.has(s.id)) {
        const p = new AudiencePoll({
          origin: poll.origin,
          token: poll.token,
          room: s.room,
          sessionId: poll.sessionId,
          fetcher: poll.fetcher,
        });
        p.configure(s.poll);
        graphPolls.set(s.id, p);
      }
      graphPoll = graphPolls.get(s.id);
      projectedPoll = graphPoll;
      pollOnStage = true;
      pollResults = false;
    } else {
      graphPoll = null;
      pollOnStage = false;
    }
    draft = validateDraft({
      ...initialDraft(),
      mode:
        s.type === "build"
          ? "brief"
          : s.type === "question"
            ? "question"
            : "material",
      title: s.title,
      body: s.type === "build" ? presentation.resolve().prompt : s.body || "",
      source: s.source || "",
      allowRemoteImages: s.allowRemoteImages === true,
    });
    publishedDraft = { ...draft };
    stage = {
      ...publicStage(draft, ++version),
      theme: presentation.definition.theme,
    };
    blank = false;
  };
  const resetLecture = () => {
    feedbackPrevious = null;
    previewTunnel.close();
    live = false;
    poll.reset();
    pollOnStage = false;
    presentation = null;
    graphPoll = null;
    graphPolls.clear();
    bridge.close();
    Object.assign(bridge.state, {
      status: "disconnected",
      activity: "Not connected",
      messages: [],
      requests: [],
      threadId: null,
      turnId: null,
      startedAt: null,
      finishedAt: null,
      outcome: null,
    });
    draft = initialDraft();
    publishedDraft = initialDraft();
    stage = publicStage(publishedDraft, ++version);
    blank = false;
    brief = acts[0].brief;
    lastBrief = "";
    activeAct = "opening";
    previousMaterial = null;
    resetVersion++;
  };
  const json = (res, value, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  };
  const deskState = () => ({
    live,
    projection: publicState(),
    audienceSync: { error: audienceSync.error },
    presentation: presentation?.state() || null,
    graphPoll: graphPoll?.state() || null,
    acts,
    scope,
    draft,
    draftPreview: publicStage(draft, version),
    stage: pollOnStage
      ? {
          ...stage,
          title: (projectedPoll || poll).config.question,
          mode: "poll",
        }
      : stage,
    blank,
    canReturnToMaterial: !!previousMaterial,
    activeAct,
    brief,
    lastBrief,
    codex: bridge.snapshot(),
    libraryStatus: library.status,
    workspace,
    savedAt,
    rehearsalJob,
    resetVersion,
    poll: poll.state(),
  });
  const publicState = () => {
    if (!live) return waitingStage();
    const c = bridge.state;
    const p = (projectedPoll || poll).state(),
      counts = p.frozen || p.snapshot;
    const projected = pollOnStage
      ? publicStage(
          {
            ...initialDraft(),
            mode: "material",
            title: p.config.question,
            body:
              p.config.options
                .map(
                  (o) =>
                    o.label +
                    (pollResults
                      ? ": " +
                        (counts?.choices.find((c) => c.id === o.id)?.votes || 0)
                      : ""),
                )
                .join("\n\n") +
              "\n\n" +
              (pollResults && p.frozen
                ? "Selected: " + p.frozen.winner.label + " — " + p.frozen.reason
                : p.configured
                  ? ""
                  : "Audience room is not configured. Discuss the choices together."),
            source: p.frozen ? "Voting closed" : "Audience vote",
          },
          String(version) +
            "-poll-" +
            (counts?.revision || 0) +
            "-" +
            !!p.frozen +
            "-" +
            pollResults,
        )
      : stage;
    const activity = [
      "Running a command",
      "Editing files",
      "Using a tool",
      "Looking up a source",
      "Responding",
      "Working",
    ].includes(c.activity)
      ? c.activity
      : "Working";
    return {
      ...projected,
      slidePosition: presentation?.position() || null,
      live: true,
      projectionKind: pollOnStage
        ? pollResults
          ? "results"
          : "question"
        : stage.mode,
      theme: stage.theme,
      blank,
      build: {
        activity,
        status: c.status,
        outcome: ["completed", "failed", "interrupted"].includes(c.outcome)
          ? c.outcome
          : null,
        startedAt: c.startedAt || null,
        finishedAt: c.finishedAt || null,
      },
    };
  };
  const audienceState = () => {
    const state = publicState();
    if (!previewTunnel.pending && (!state.live || state.mode !== "demo")) previewTunnel.close();
    return state.mode === "demo" ? {...state,demoUrl:previewTunnel.publicUrl(state.demoUrl)} : state;
  };
  const sharePreview = async (url) => {
    if (poll.origin && poll.token && new URL(url).protocol === "http:")
      await previewTunnel.open(url, origin);
  };
  const broadcastTimer = setInterval(() => {
    if (!liveTransition) audienceSync.publish(audienceState());
  }, 1000);
  broadcastTimer.unref();
  const server = createServer(async (req, res) => {
    res.setHeader("cache-control", "no-store");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader(
      "content-security-policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-src http://127.0.0.1:* http://localhost:* https:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
    );
    try {
      if (req.headers.host !== new URL(origin).host)
        return json(res, { error: "Host not allowed" }, 403);
      if (req.headers.origin && req.headers.origin !== origin)
        return json(res, { error: "Origin not allowed" }, 403);
      if (req.headers["sec-fetch-site"] === "cross-site")
        return json(res, { error: "Cross-site request rejected" }, 403);
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith("/api/")) {
        const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        const isDesk = safeEqual(token, deskToken),
          isStage = safeEqual(token, stageToken);
        if (
          !isDesk &&
          !(isStage && url.pathname === "/api/stage" && req.method === "GET")
        )
          return json(res, { error: "This window is not authorized" }, 401);
        if (req.method === "GET") {
          if (url.pathname === "/api/desk") return json(res, deskState());
          if (url.pathname === "/api/feedback")
            return json(res, await feedbackRequest(poll));
          if (url.pathname === "/api/stage") return json(res, publicState());
          if (url.pathname === "/api/stage-link")
            return json(res, { url: origin + "/stage" });
          if (url.pathname === "/api/library") {
            libraryFiles = await library.list();
            lectureSearch.clear();
            return json(res, { files: libraryFiles });
          }
          if (url.pathname === "/api/search") {
            if (!libraryFiles.length) libraryFiles = await library.list();
            return json(
              res,
              await lectureSearch.search(url.searchParams.get("q")),
            );
          }
          if (url.pathname === "/api/note") {
            const path = url.searchParams.get("path");
            if (!libraryFiles.some((file) => file.path === path))
              throw new Error("Select a note from the lecture library first");
            const note = await library.read(path);
            return json(res, {
              ...note,
              sections: note.sections.map((section) => ({
                ...section,
                html: renderMarkdown(section.body),
              })),
            });
          }
          return json(res, { error: "Not found" }, 404);
        }
        if (req.method !== "POST" || req.headers.origin !== origin)
          return json(res, { error: "Same-origin POST required" }, 403);
        const body = await readJson(req);
        if (url.pathname === "/api/feedback") {
          if (graphBusy || liveTransition)
            throw new Error("Wait for the current stage update");
          graphBusy = true;
          try {
            if (
              body.action === "show-question" ||
              body.action === "show-cloud"
            ) {
              if (!live) throw new Error("Turn Live on first");
              const snapshot = await feedbackRequest(poll);
              const selected = feedbackSlide(
                snapshot,
                body.action === "show-question" ? body.id : null,
              );
              feedbackPrevious ||= { stage, pollOnStage };
              stage = { ...stage, ...selected, version: ++version };
              pollOnStage = false;
              blank = false;
              return json(res, deskState());
            }
            if (body.action === "return") {
              if (feedbackPrevious) {
                stage = { ...feedbackPrevious.stage, version: ++version };
                pollOnStage = feedbackPrevious.pollOnStage;
                feedbackPrevious = null;
              }
              return json(res, deskState());
            }
            if (body.action === "start") {
              if (!live) throw new Error("Turn Live on first");
              await audienceSync.deliver(audienceState());
            }
            return json(res, await feedbackRequest(poll, body));
          } finally {
            graphBusy = false;
          }
        }
        if (url.pathname.startsWith("/api/presentation/")) {
          if (graphBusy || rehearsalJob.status === "creating")
            throw new Error("Presentation operation in progress");
          graphBusy = true;
          try {
            const op = url.pathname.slice("/api/presentation/".length);
            if (op === "live") {
              if (typeof body.live !== "boolean")
                throw new Error("Choose Live on or off");
              if (body.live) {
                if (!presentation) throw new Error("Load a presentation first");
                showGraph();
                live = true;
                audienceSync.publish(audienceState());
              } else {
                if (
                  [...graphPolls.values(), poll].some(
                    (p) => p.busy || p.snapshot?.status === "open",
                  )
                )
                  throw new Error("Close voting before turning Live off");
                liveTransition = true;
                try {
                  await audienceSync.deliver(waitingStage());
                  live = false;
                  previewTunnel.close();
                  version++;
                } catch (error) {
                  audienceSync.publish(audienceState());
                  throw error;
                } finally {
                  liveTransition = false;
                }
              }
              return json(res, deskState());
            }
            if (op === "load" || op === "unload") {
              if (live)
                throw new Error("Turn Live off before changing presentations");
              if (
                bridge.state.turnId ||
                [...graphPolls.values(), poll].some(
                  (p) => p.busy || p.snapshot?.status === "open",
                )
              )
                throw new Error(
                  "Finish the build and close voting before changing presentations",
                );
              let next = null;
              if (op === "load") {
                const files = await library.list();
                if (!files.some((f) => f.path === body.path))
                  throw new Error(
                    "Select a presentation from the lecture folder",
                  );
                next = new PresentationSession(
                  parsePresentation(await library.read(body.path)),
                  body.path,
                );
              }
              poll.reset();
              presentation = next;
              graphPoll = null;
              graphPolls.clear();
              // Loading is private: the existing projection stays until navigation.
            } else {
              if (!presentation) throw new Error("Load a presentation first");
              if (op === "select") {
                presentation.move("select", body.id);
              } else if (
                ["next", "previous", "detour", "return", "show"].includes(op)
              ) {
                if (op !== "show") presentation.move(op, body.id);
                showGraph();
              } else if (op === "defaults") {
                presentation.defaults.add(presentation.current);
                showGraph();
              } else if (
                op === "poll-open" ||
                op === "poll-close" ||
                op === "poll-refresh"
              ) {
                if (op === "poll-open" && !live)
                  throw new Error("Turn Live on before opening voting");
                if (presentation.step().type !== "poll")
                  throw new Error("Choose a poll step");
                const s = presentation.step();
                if (!graphPolls.has(s.id)) {
                  const p = new AudiencePoll({
                    origin: poll.origin,
                    token: poll.token,
                    room: s.room,
                    sessionId: poll.sessionId,
                    fetcher: poll.fetcher,
                  });
                  p.configure(s.poll);
                  graphPolls.set(s.id, p);
                }
                graphPoll = graphPolls.get(s.id);
                if (
                  op === "poll-open" &&
                  [...graphPolls.values(), poll].some(
                    (p) => p !== graphPoll && p.snapshot?.status === "open",
                  )
                )
                  throw new Error("Close the current vote first");
                await graphPoll.act(
                  op === "poll-open"
                    ? "open"
                    : op === "poll-close"
                      ? "lock"
                      : "refresh",
                );
                if (graphPoll.frozen)
                  presentation.decisions[presentation.current] =
                    structuredClone(graphPoll.frozen);
                else if (op === "poll-open")
                  delete presentation.decisions[presentation.current];
              } else if (op === "poll-question" || op === "poll-results") {
                if (presentation.step().type !== "poll")
                  throw new Error("Choose a poll step");
                showGraph();
                pollResults = op === "poll-results";
              } else if (op === "build") {
                if (presentation.step().type !== "build")
                  throw new Error("Choose a build step");
                const resolved = presentation.resolve();
                if (resolved.missing.length)
                  throw new Error(
                    "Collect the required decisions or explicitly accept prepared defaults",
                  );
                if (
                  presentation.runs.some((r) => r.step === presentation.current)
                )
                  throw new Error(
                    "This step has already started in this session",
                  );
                showGraph();
                await bridge.start(resolved.prompt, body.model || "");
                lastBrief = brief = resolved.prompt;
                presentation.runs.push({
                  step: presentation.current,
                  prompt: resolved.prompt,
                  inputs: structuredClone(resolved.inputs),
                  startedAt: new Date().toISOString(),
                });
              } else throw new Error("Unknown presentation operation");
            }
            return json(res, deskState());
          } finally {
            graphBusy = false;
          }
        }
        if (url.pathname.startsWith("/api/poll/")) {
          if (rehearsalJob.status === "creating")
            throw new Error("Wait for the fresh rehearsal");
          const action = url.pathname.slice("/api/poll/".length);
          if (action === "select") poll.select(body.id);
          else if (action === "configure") poll.configure(body);
          else if (["open", "lock", "refresh"].includes(action))
            await poll.act(action);
          else if (action === "receipt")
            return json(res, { text: poll.receipt() });
          else if (action === "show") {
            if (!pollOnStage) previousMaterial = { ...publishedDraft };
            pollOnStage = true;
            blank = false;
            version++;
          } else return json(res, { error: "Not found" }, 404);
          return json(res, deskState());
        }
        if (
          rehearsalJob.status === "creating" &&
          !["/api/codex/interrupt", "/api/codex/answer"].includes(url.pathname)
        )
          return json(
            res,
            { error: "A fresh rehearsal is being prepared. Please wait." },
            409,
          );
        if (
          url.pathname === "/api/reset-lecture" ||
          url.pathname === "/api/new-rehearsal"
        ) {
          if (
            graphBusy ||
            [...graphPolls.values()].some(
              (p) => p.busy || p.snapshot?.status === "open",
            )
          )
            throw new Error("Close presentation voting before resetting");
          if (body.confirm !== true) throw new Error("Confirm the reset first");
          if (poll.busy) throw new Error("Wait for the current poll operation");
          if (poll.snapshot?.status === "open" && !poll.frozen)
            throw new Error("Close the audience vote before resetting");
          if (url.pathname === "/api/reset-lecture") {
            resetLecture();
            return json(res, deskState());
          }
          rehearsalJob = { status: "creating" };
          // Disconnect only after setup succeeds; a failed clone leaves the current session intact.
          void rehearsals
            .create()
            .then((next) => {
              workspace = next;
              resetLecture();
              rehearsalJob = { status: "ready" };
            })
            .catch(() => {
              rehearsalJob = {
                status: "failed",
                error:
                  "Setup failed. Previous rehearsal is unchanged. Check network, Git and npm; the attempted folder was retained.",
              };
            });
          return json(res, deskState(), 202);
        }
        if (url.pathname === "/api/draft") {
          draft = validateDraft(body);
          draft.demoUrl = validDemoUrl(draft.demoUrl, origin);
        } else if (url.pathname === "/api/act") {
          if (!acts.some((a) => a.id === body.act))
            throw new Error("Unknown narrative beat");
          activeAct = body.act;
        } else if (url.pathname === "/api/publish") {
          if (!presentation) live = true;
          pollOnStage = false;
          const next = validateDraft(body);
          next.demoUrl = validDemoUrl(next.demoUrl, origin);
          draft = next;
          publishedDraft = { ...next };
          stage = publicStage(publishedDraft, ++version, stage.brief);
          blank = false;
        } else if (url.pathname === "/api/show-preview") {
          if (typeof body.url !== "string" || body.url.length > 2048)
            throw new Error("Invalid preview URL");
          const demoUrl = validDemoUrl(body.url, origin);
          if (!demoUrl) throw new Error("Choose a preview URL");
          if (live || !presentation) await sharePreview(demoUrl);
          if (!presentation) live = true;
          pollOnStage = false;
          if (!["demo", "brief"].includes(publishedDraft.mode))
            previousMaterial = { ...publishedDraft };
          publishedDraft = {
            ...initialDraft(),
            act: activeAct,
            mode: "demo",
            title: "Live app · work in progress",
            body: "",
            demoUrl,
            source: "Agent-supplied preview · selected by the lecturer",
          };
          stage = publicStage(publishedDraft, ++version);
          blank = false;
        } else if (url.pathname === "/api/back-material") {
          if (!presentation) live = true;
          pollOnStage = false;
          if (!previousMaterial) throw new Error("No previous material");
          publishedDraft = previousMaterial;
          previousMaterial = null;
          stage = publicStage(publishedDraft, ++version);
          blank = false;
        } else if (url.pathname === "/api/blank") {
          blank = body.blank === true;
        } else if (url.pathname === "/api/brief") {
          if (typeof body.brief !== "string" || body.brief.length > 20000)
            throw new Error("Brief is too long");
          brief = body.brief;
        } else if (
          url.pathname === "/api/publish-brief" ||
          url.pathname === "/api/publish-sent-brief"
        ) {
          if (!presentation) live = true;
          pollOnStage = false;
          const sent = url.pathname === "/api/publish-sent-brief";
          const text = sent ? lastBrief : body.brief;
          if (typeof text !== "string" || !text.trim() || text.length > 20000)
            throw new Error(
              sent
                ? "No successfully submitted prompt yet"
                : "Use a non-empty prompt under 20,000 characters",
            );
          if (!["brief", "demo"].includes(publishedDraft.mode))
            previousMaterial = { ...publishedDraft };
          if (!sent) brief = text;
          publishedDraft = {
            ...draft,
            mode: "brief",
            title: sent
              ? "The prompt sent to Codex"
              : "The prompt we are discussing",
            body: text,
            source: sent
              ? "Exact submitted prompt"
              : "Draft prompt · not sent by this action",
          };
          stage = publicStage(publishedDraft, ++version, text);
          blank = false;
        } else if (url.pathname === "/api/codex/connect") {
          await bridge.connect(workspace);
        } else if (url.pathname === "/api/codex/start") {
          if (
            typeof body.brief !== "string" ||
            !body.brief.trim() ||
            body.brief.length > 20000
          )
            throw new Error("Review a non-empty brief first");
          await bridge.start(body.brief, body.model || "");
          lastBrief = body.brief;
          brief = body.brief;
        } else if (url.pathname === "/api/codex/interrupt") {
          await bridge.interrupt();
        } else if (url.pathname === "/api/codex/disconnect") {
          bridge.close();
        } else if (url.pathname === "/api/codex/answer") {
          bridge.answer(body.id, body.decision, body.answers);
        } else if (url.pathname === "/api/restore") {
          if (!persist) throw new Error("Saving is disabled in test mode");
          const saved = JSON.parse(
            await readFile(resolve(root, ".local/session.json"), "utf8"),
          );
          const next = validateDraft(saved.draft);
          next.demoUrl = validDemoUrl(next.demoUrl, origin);
          if (typeof saved.brief !== "string" || saved.brief.length > 20000)
            throw new Error("Invalid saved brief");
          if (saved.pollConfig) poll.configure(saved.pollConfig);
          draft = next;
          brief = saved.brief;
          activeAct = acts.some((a) => a.id === saved.activeAct)
            ? saved.activeAct
            : "opening";
          savedAt = saved.savedAt;
          // Restoring a private draft must never restore the projected screen or run an agent.
        } else if (url.pathname === "/api/save") {
          if (!persist) throw new Error("Saving is disabled in test mode");
          await mkdir(resolve(root, ".local"), {
            recursive: true,
            mode: 0o700,
          });
          savedAt = new Date().toISOString();
          await writeFile(
            resolve(root, ".local/session.json"),
            JSON.stringify(
              {
                savedAt,
                activeAct,
                draft,
                publishedDraft,
                brief,
                lastBrief,
                pollConfig: poll.config,
              },
              null,
              2,
            ),
            { mode: 0o600 },
          );
        } else return json(res, { error: "Not found" }, 404);
        return json(res, deskState());
      }
      if (req.method !== "GET")
        return json(res, { error: "Method not allowed" }, 405);
      let path;
      const staticFiles = {
        "/": "desk.html",
        "/desk": "desk.html",
        "/stage": "stage.html",
        "/style.css": "style.css",
        "/desk.mjs": "desk.mjs",
        "/stage.mjs": "stage.mjs",
        "/shared.mjs": "shared.mjs",
        "/explore.mjs": "explore.mjs",
        "/presentation.mjs": "presentation.mjs",
      };
      if (staticFiles[url.pathname])
        path = resolve(root, "public", staticFiles[url.pathname]);
      else if (url.pathname.startsWith("/vendor/mermaid/")) {
        const vendorRoot = await realpath(
          resolve(root, "node_modules/mermaid/dist"),
        );
        path = await realpath(
          resolve(
            vendorRoot,
            decodeURIComponent(url.pathname.slice("/vendor/mermaid/".length)),
          ),
        );
        if (
          !path.startsWith(vendorRoot + sep) ||
          ![".mjs", ".js", ".woff2"].includes(extname(path))
        )
          return json(res, { error: "Not found" }, 404);
      } else if (url.pathname === "/feedback.mjs")
        path = resolve(root, "public/feedback.mjs");
      else return json(res, { error: "Not found" }, 404);
      let content = await readFile(path);
      if (["/", "/desk", "/stage"].includes(url.pathname)) {
        const token = url.pathname === "/stage" ? stageToken : deskToken;
        content = content.toString().replace("</head>", '<meta name="lecture-token" content="' + token + '"></head>');
      }
      const type = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".mjs": "text/javascript",
        ".js": "text/javascript",
        ".woff2": "font/woff2",
      }[extname(path)];
      res.writeHead(200, { "content-type": type });
      res.end(content);
    } catch (error) {
      json(
        res,
        { error: String(error.message || "Request failed").slice(0, 2000) },
        400,
      );
    }
  });
  server.on("close", () => {
    clearInterval(broadcastTimer);
    audienceSync.close();
    previewTunnel.close();
    bridge.close();
    void library.close();
  });
  return {
    server,
    bridge,
    library,
    async start() {
      if (persist) workspace = await rehearsals.current(workspace);
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      origin = "http://" + (host === "::1" ? "[::1]" : host) + ":" + server.address().port;
      return {
        origin,
        deskUrl: origin + "/desk",
        stageUrl: origin + "/stage",
        deskToken,
        stageToken,
      };
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const studio = createStudio({
    port: Number(process.env.LECTURE_PORT || 4317),
    workspace: resolve(
      root,
      process.env.LECTURE_WORKSPACE || "../lecture-studio",
    ),
  });
  const address = await studio.start();
  console.log(
    "Lecture Studio · local only\nPrivate desk: " +
      address.deskUrl +
      "\nProject only: " +
      address.stageUrl +
      "\nCodex implementation starts only when you send a brief.",
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      studio.bridge.close();
      studio.server.close();
      studio.server.closeAllConnections();
      void studio.library.close().finally(() => process.exit(0));
    });
}
