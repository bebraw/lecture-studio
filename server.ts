import { previewCandidates } from "./shared/preview.ts";
import { asyncHandler } from "./shared/errors.ts";
import { validateApiRequest, type DeskState } from "./shared/api.ts";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type {
  Library,
  Bridge,
  Draft,
  Stage,
  NoteFile,
  Step,
} from "./shared/models.ts";
export interface StudioOptions {
  library?: Library;
  bridge?: Bridge;
  poll?: AudiencePoll;
  workspace?: string;
  rehearsals?: Pick<Rehearsals, "current" | "create">;
  port?: number;
  host?: string;
  persist?: boolean;
  previewTunnel?: Pick<
    PreviewTunnel,
    "open" | "publicUrl" | "close" | "pending"
  >;
}
import { readJson } from "./lib/local-http.ts";
import {
  asError,
  record,
  stringValue,
  optionalString,
  stringMap,
} from "./shared/errors.ts";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, extname, sep } from "node:path";
import { acts, initialDraft, scope } from "./lib/narrative.ts";
import { validateDraft, publicStage, renderMarkdown } from "./lib/material.ts";
import { ObsidianLibrary } from "./lib/obsidian.ts";
import { CodexBridge } from "./lib/codex.ts";
import { Rehearsals } from "./lib/rehearsals.ts";
import { AudiencePoll } from "./lib/audience-poll.ts";
import { PreviewTunnel } from "./lib/preview-tunnel.ts";
import { AudienceStageSync } from "./lib/audience-stage.ts";
import { LectureSearch } from "./lib/lecture-search.ts";
import { parsePresentation, PresentationSession } from "./lib/presentation.ts";
import { feedbackRequest, feedbackSlide } from "./lib/feedback.ts";

const root = dirname(fileURLToPath(import.meta.url));
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function validDemoUrl(value: string, ownOrigin: string) {
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
export function createStudio({
  library = new ObsidianLibrary(),
  bridge = new CodexBridge(),
  poll = new AudiencePoll(),
  previewTunnel = new PreviewTunnel(),
  workspace = resolve(root, "../lecture-demo"),
  rehearsals = new Rehearsals(resolve(root, ".local/rehearsals")),
  port = 4317,
  host = "127.0.0.1",
  persist = true,
}: StudioOptions = {}) {
  if (!["127.0.0.1", "::1"].includes(host))
    throw new Error("Lecture Studio must bind to loopback");
  const deskToken = randomBytes(32).toString("hex"),
    stageToken = randomBytes(32).toString("hex");
  const lectureSearch = new LectureSearch(library);
  const audienceSync = new AudienceStageSync(poll);
  let origin = "",
    draft = initialDraft(),
    publishedDraft = initialDraft(),
    version = 1,
    blank = false,
    brief = acts[0].brief;
  let stage = publicStage(publishedDraft, version),
    lastBrief = "";
  let activeAct = "opening",
    libraryFiles: NoteFile[] = [],
    savedAt: string | null = null;
  let previousMaterial: Draft | null = null;
  let feedbackPrevious: { stage: Stage; pollOnStage: boolean } | null = null;
  let rehearsalJob: { status: string; error?: string; workspace?: string } = {
      status: "idle",
    },
    resetVersion = 0;
  let pollOnStage = false,
    projectedPoll: AudiencePoll | null = null,
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
  let presentation: PresentationSession | null = null,
    graphPoll: AudiencePoll | null = null,
    graphBusy = false;
  let audienceSessionStarted = false;
  const graphPolls = new Map<string, AudiencePoll>();
  const getGraphPoll = (step: Step) => {
    let selected = graphPolls.get(step.id);
    if (!selected) {
      selected = new AudiencePoll({
        origin: poll.origin ?? "",
        token: poll.token ?? "",
        ...(step.room === undefined ? {} : { room: step.room }),
        sessionId: poll.sessionId,
        fetcher: poll.fetcher,
      });
      selected.configure(step.poll);
      graphPolls.set(step.id, selected);
    }
    return selected;
  };
  const openGraphPoll = async () => {
    if (!presentation) return;
    const selected =
      presentation.step().type === "poll"
        ? getGraphPoll(presentation.step())
        : null;
    for (const [id, activePoll] of graphPolls) {
      if (activePoll === selected || activePoll.snapshot?.status !== "open")
        continue;
      await activePoll.act("lock");
      if (activePoll.frozen)
        presentation.decisions[id] = structuredClone(activePoll.frozen);
    }
    if (poll !== selected && poll.snapshot?.status === "open")
      await poll.act("lock");
    if (!selected || selected.frozen || selected.snapshot?.status === "open")
      return;
    await selected.act("open");
  };
  const buildPreviews = new Map<string, string>();
  const captureBuildPreview = () => {
    const run = presentation?.runs.at(-1);
    const url = previewCandidates(bridge.state.messages, origin).at(-1);
    if (run && url) buildPreviews.set(run.step, validDemoUrl(url, origin));
  };
  let wordCloudStep: string | null = null;
  const wordCloudRounds = new Map<string, string>();
  const captureWords = (
    snapshot: Awaited<ReturnType<typeof feedbackRequest>>,
  ) => {
    const id = snapshot.config && wordCloudRounds.get(snapshot.config.round);
    if (presentation && id && snapshot.config?.mode === "words")
      presentation.approvedWords[id] = snapshot.items
        .filter((item) => item.status === "approved")
        .map((item) => item.text);
  };
  const syncWordCloud = async (enabled: boolean) => {
    const step = presentation?.step();
    if (enabled && step?.wordCloud) {
      if (wordCloudStep === step.id) return;
      if (wordCloudStep)
        captureWords(await feedbackRequest(poll, { action: "close" }));
      const snapshot = await feedbackRequest(poll, {
        action: "start",
        mode: "words",
        prompt: step.title,
        collection: poll.sessionId + ":" + step.id,
      });
      if (snapshot.config) wordCloudRounds.set(snapshot.config.round, step.id);
      wordCloudStep = step.id;
    } else if (wordCloudStep) {
      captureWords(await feedbackRequest(poll, { action: "close" }));
      wordCloudStep = null;
    }
  };
  const showGraph = async () => {
    if (!presentation) throw new Error("Load a presentation first");
    feedbackPrevious = null;
    const s = presentation.step();
    if (live) await syncWordCloud(true);
    if ((s.wordsFrom || s.reviewWordsFrom) && poll.origin && poll.token)
      captureWords(await feedbackRequest(poll));
    captureBuildPreview();
    const demoUrl = s.previewOf ? buildPreviews.get(s.previewOf) : undefined;
    if (demoUrl) await sharePreview(demoUrl);
    if (s.type === "poll") {
      graphPoll = getGraphPoll(s);
      projectedPoll = graphPoll;
      pollOnStage = true;
      pollResults = !!graphPoll.frozen;
    } else {
      graphPoll = null;
      pollOnStage = false;
    }
    draft = validateDraft({
      ...initialDraft(),
      act: (s.chapter || "Related").slice(0, 40),
      demoUrl: demoUrl || "",
      mode: demoUrl
        ? "demo"
        : s.type === "build"
          ? "brief"
          : s.type === "question"
            ? "question"
            : "material",
      title: s.title,
      body: demoUrl
        ? ""
        : s.previewOf
          ? "The app preview is not available yet."
          : s.type === "build"
            ? presentation.resolve().prompt
            : s.reviewWordsFrom
              ? presentation.resolve().prompt
              : s.body || "",
      source: s.source || "",
      allowRemoteImages: s.allowRemoteImages === true,
    });
    publishedDraft = { ...draft };
    stage = {
      ...publicStage(draft, ++version),
      theme: presentation.definition.theme,
      slidePosition: presentation.position(),
      slideType: s.type,
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
    audienceSessionStarted = false;
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
  const json = (res: ServerResponse, value: unknown, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  };
  const updateBuildRun = () => {
    const run = presentation?.runs.at(-1);
    const state = bridge.state;
    if (
      run?.status === "running" &&
      !state.turnId &&
      !["running", "waiting"].includes(state.status)
    ) {
      run.status =
        state.outcome === "completed"
          ? "completed"
          : state.outcome === "failed"
            ? "failed"
            : "interrupted";
    }
  };
  const deskState = (): DeskState => {
    updateBuildRun();
    return {
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
    };
  };
  const publicState = (): Stage => {
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
    ].includes(c.activity ?? "")
      ? c.activity
      : "Working";
    return {
      ...projected,
      slidePosition: stage.slidePosition || null,
      live: true,
      projectionKind: pollOnStage
        ? pollResults
          ? "results"
          : "poll"
        : stage.mode,
      ...(pollOnStage ? { pollId: (projectedPoll || poll).room } : {}),
      ...(stage.theme === undefined ? {} : { theme: stage.theme }),
      blank,
      build: {
        ...(activity === undefined ? {} : { activity }),
        status: c.status,
        outcome: ["completed", "failed", "interrupted"].includes(
          c.outcome ?? "",
        )
          ? (c.outcome ?? null)
          : null,
        startedAt: c.startedAt || null,
        finishedAt: c.finishedAt || null,
      },
    };
  };
  const audienceState = () => {
    const state = publicState();
    if (!previewTunnel.pending && (!state.live || state.mode !== "demo"))
      previewTunnel.close();
    return state.mode === "demo"
      ? { ...state, demoUrl: previewTunnel.publicUrl(state.demoUrl) }
      : state;
  };
  const sharePreview = async (url: string) => {
    if (poll.origin && poll.token && new URL(url).protocol === "http:")
      await previewTunnel.open(url, origin);
  };
  const broadcastTimer = setInterval(() => {
    if (!liveTransition) audienceSync.publish(audienceState());
  }, 1000);
  broadcastTimer.unref();
  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("cache-control", "no-store");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader(
      "content-security-policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-src http://127.0.0.1:* http://localhost:* https:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'",
    );
    try {
      if (req.headers.host !== new URL(origin).host)
        return json(res, { error: "Host not allowed" }, 403);
      if (req.headers.origin && req.headers.origin !== origin)
        return json(res, { error: "Origin not allowed" }, 403);
      if (req.headers["sec-fetch-site"] === "cross-site")
        return json(res, { error: "Cross-site request rejected" }, 403);
      const url = new URL(req.url ?? "/", origin);
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
            const note = await library.read(path!);
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
        validateApiRequest(url.pathname.slice("/api/".length), body);
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
              captureWords(snapshot);
              const selected = feedbackSlide(
                snapshot,
                body.action === "show-question"
                  ? stringValue(body.id, "question")
                  : undefined,
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
            const snapshot = await feedbackRequest(poll, body);
            captureWords(snapshot);
            return json(res, snapshot);
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
                if (!audienceSessionStarted && poll.origin && poll.token) {
                  const response = await poll.fetcher(
                    poll.origin + "/presenter/reset-lecture",
                    {
                      method: "POST",
                      headers: { authorization: "Bearer " + poll.token },
                      redirect: "error",
                      signal: AbortSignal.timeout(8000),
                    },
                  );
                  await response.body?.cancel();
                  if (!response.ok)
                    throw new Error(
                      "Could not clear earlier audience responses. Deploy the updated audience Worker and try Live on again.",
                    );
                  graphPolls.clear();
                  graphPoll = null;
                  projectedPoll = null;
                  poll.reset();
                  presentation.decisions = {};
                  presentation.approvedWords = {};
                  wordCloudRounds.clear();
                  wordCloudStep = null;
                  feedbackPrevious = null;
                  audienceSessionStarted = true;
                }
                liveTransition = true;
                try {
                  await openGraphPoll();
                  await showGraph();
                  live = true;
                  await audienceSync.deliver(audienceState());
                  await syncWordCloud(true);
                } catch (caught) {
                  // Confirm rollback before reporting that the broadcast is off.
                  for (const active of [...graphPolls.values(), poll]) {
                    if (active.snapshot?.status === "open")
                      await active.act("lock");
                  }
                  await syncWordCloud(false);
                  await audienceSync.deliver(waitingStage());
                  live = false;
                  throw caught;
                } finally {
                  liveTransition = false;
                }
              } else {
                if ([...graphPolls.values(), poll].some((p) => p.busy))
                  throw new Error(
                    "Wait for the current voting operation to finish",
                  );
                liveTransition = true;
                try {
                  for (const [id, activePoll] of graphPolls) {
                    if (activePoll.snapshot?.status !== "open") continue;
                    await activePoll.act("lock");
                    if (presentation && activePoll.frozen)
                      presentation.decisions[id] = structuredClone(
                        activePoll.frozen,
                      );
                  }
                  if (poll.snapshot?.status === "open") await poll.act("lock");
                  await syncWordCloud(false);
                  await audienceSync.deliver(waitingStage());
                  live = false;
                  previewTunnel.close();
                  version++;
                } catch (caught) {
                  const error = asError(caught);
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
                  parsePresentation(
                    await library.read(
                      stringValue(body.path, "presentation path"),
                    ),
                  ),
                  stringValue(body.path, "presentation path"),
                );
              }
              poll.reset();
              presentation = next;
              wordCloudRounds.clear();
              wordCloudStep = null;
              audienceSessionStarted = false;
              graphPoll = null;
              graphPolls.clear();
              buildPreviews.clear();
              // Loading is private: the existing projection stays until navigation.
            } else {
              if (!presentation) throw new Error("Load a presentation first");
              if (op === "select") {
                presentation.move("select", stringValue(body.id, "step"));
              } else if (
                ["next", "previous", "detour", "return", "show"].includes(op)
              ) {
                if (op !== "show")
                  presentation.move(op, optionalString(body.id, "step"));
                if (live) await openGraphPoll();
                await showGraph();
              } else if (op === "defaults") {
                presentation.defaults.add(presentation.current);
                await showGraph();
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
                graphPoll = getGraphPoll(s);
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
                if (op === "poll-close" || op === "poll-open") {
                  await showGraph();
                  pollResults = op === "poll-close";
                }
              } else if (op === "poll-question" || op === "poll-results") {
                if (presentation.step().type !== "poll")
                  throw new Error("Choose a poll step");
                await showGraph();
                pollResults = op === "poll-results";
              } else if (op === "build") {
                if (presentation.step().type !== "build")
                  throw new Error("Choose a build step");
                if (presentation.step().wordsFrom && poll.origin && poll.token)
                  captureWords(await feedbackRequest(poll));
                const resolved = presentation.resolve();
                if (resolved.missing.length)
                  throw new Error(
                    "Collect the required decisions or explicitly accept prepared defaults",
                  );
                updateBuildRun();
                const prior = presentation.runs.findLast(
                  (r) => r.step === presentation!.current,
                );
                if (
                  prior &&
                  !["failed", "interrupted"].includes(prior.status ?? "running")
                )
                  throw new Error("This build is running or has completed");
                if (prior && body.retry !== true)
                  throw new Error(
                    "Choose Retry this build to reuse its approved inputs",
                  );
                const attempt = prior ?? resolved;
                await showGraph();
                await bridge.start(
                  attempt.prompt,
                  optionalString(body.model, "model") ?? "",
                );
                lastBrief = brief = attempt.prompt;
                presentation.runs.push({
                  step: presentation.current,
                  prompt: attempt.prompt,
                  inputs: structuredClone(attempt.inputs),
                  status: "running",
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
          if (action === "select") poll.select(stringValue(body.id, "poll"));
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
          activeAct = stringValue(body.act, "narrative beat");
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
          await bridge.start(
            body.brief,
            optionalString(body.model, "model") ?? "",
          );
          lastBrief = body.brief;
          brief = body.brief;
        } else if (url.pathname === "/api/codex/interrupt") {
          await bridge.interrupt();
        } else if (url.pathname === "/api/codex/disconnect") {
          bridge.close();
        } else if (url.pathname === "/api/codex/answer") {
          if (typeof body.id !== "string" && typeof body.id !== "number")
            throw new Error("Invalid approval ID");
          bridge.answer(
            body.id,
            stringValue(body.decision, "decision"),
            stringMap(body.answers),
          );
        } else if (url.pathname === "/api/restore") {
          if (!persist) throw new Error("Saving is disabled in test mode");
          const saved = record(
            JSON.parse(
              await readFile(resolve(root, ".local/session.json"), "utf8"),
            ),
          );
          const next = validateDraft(saved.draft);
          next.demoUrl = validDemoUrl(next.demoUrl, origin);
          if (typeof saved.brief !== "string" || saved.brief.length > 20000)
            throw new Error("Invalid saved brief");
          if (saved.pollConfig) poll.configure(saved.pollConfig);
          draft = next;
          brief = saved.brief;
          activeAct = acts.some((a) => a.id === saved.activeAct)
            ? stringValue(saved.activeAct, "saved narrative beat")
            : "opening";
          savedAt = optionalString(saved.savedAt, "saved timestamp") ?? null;
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
      const staticFiles: Record<string, string> = {
        "/": "desk.html",
        "/desk": "desk.html",
        "/stage": "stage.html",
        "/debug": "debug.html",
        "/debug.css": "debug.css",
        "/debug.mjs": "debug.mjs",
        "/style.css": "style.css",
        "/desk.mjs": "desk.mjs",
        "/stage.mjs": "stage.mjs",
        "/shared.mjs": "shared.mjs",
        "/explore.mjs": "explore.mjs",
        "/presentation.mjs": "presentation.mjs",
      };
      const staticFile = staticFiles[url.pathname];
      if (staticFile)
        path = resolve(
          root,
          staticFile.endsWith(".mjs") ? ".local/browser/public" : "public",
          staticFile,
        );
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
        path = resolve(root, ".local/browser/public/feedback.mjs");
      else return json(res, { error: "Not found" }, 404);
      let content: string | Buffer = await readFile(path);
      if (["/", "/desk", "/stage"].includes(url.pathname)) {
        const token = url.pathname === "/stage" ? stageToken : deskToken;
        content = content
          .toString()
          .replace(
            "</head>",
            '<meta name="lecture-token" content="' + token + '"></head>',
          );
      }
      const types: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".mjs": "text/javascript",
        ".js": "text/javascript",
        ".woff2": "font/woff2",
      };
      const type = types[extname(path)] ?? "application/octet-stream";
      res.writeHead(200, { "content-type": type });
      res.end(content);
    } catch (caught) {
      const error = asError(caught);
      json(
        res,
        { error: String(error.message || "Request failed").slice(0, 2000) },
        400,
      );
    }
  };
  const server = createServer(asyncHandler(handleRequest));
  server.on("close", () => {
    clearInterval(broadcastTimer);
    audienceSync.close();
    previewTunnel.close();
    bridge.close();
    void library.close();
  });
  return {
    server,
    snapshot: deskState,
    bridge,
    library,
    async start() {
      if (persist) workspace = await rehearsals.current(workspace);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      origin =
        "http://" +
        (host === "::1" ? "[::1]" : host) +
        ":" +
        (server.address() as AddressInfo).port;
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
      process.env.LECTURE_WORKSPACE || "../lecture-demo",
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
