import { asyncHandler } from "../shared/errors.ts";
import type { PresentationCommand } from "../shared/api.ts";
import type { MountOptions, DeskState } from "../shared/api.ts";
import { query, all, byId } from "./dom.ts";
import { asError } from "../shared/errors.ts";
import { applyTheme } from "./shared.ts";
import { renderSlidePreview } from "./slide-preview.ts";
import { mountPollMonitor } from "./poll-monitor.ts";
import { renderWebDemo } from "./web-demo.ts";
export function mountPresentations({ call, update }: MountOptions) {
  const setup = document.createElement("section");
  setup.id = "presentation-setup";
  setup.innerHTML =
    '<h2>Presentation</h2><button id="presentations-list">Find presentations in Obsidian</button><select id="presentation-choice" aria-label="Presentation"></select><button id="presentation-load">Load snapshot / restart presentation</button><button id="presentation-unload">Use original lecture</button><p id="presentation-message" role="status"></p>';
  query(".plot", document).before(setup);
  const rehearsalControls = query(".rehearsal-controls", document);
  const session = document.createElement("details");
  session.id = "session-menu";
  session.innerHTML =
    '<summary>Session</summary><div class="session-actions"><button id="restart-presentation">Restart presentation…</button></div>';
  query(".top-actions", document).append(session);
  if (rehearsalControls)
    query(".session-actions", session).append(rehearsalControls);
  const outline = document.createElement("nav");
  outline.id = "presentation-outline";
  outline.setAttribute("aria-label", "Presentation outline");
  query(".plot", document).before(outline);
  const panel = document.createElement("section");
  panel.id = "graph-presentation";
  panel.hidden = true;
  panel.innerHTML =
    '<span id="graph-label" class="section-label"></span><h2 id="graph-title"></h2><p id="graph-notes" class="small muted"></p><pre id="graph-prompt"></pre><div id="graph-detours" class="button-row"></div><div class="button-row"><button id="graph-previous">Previous</button><button id="graph-next" class="primary">Begin presentation</button><button id="graph-return">Return to narrative</button><button id="graph-defaults">Use declared defaults</button><button id="graph-build">Start this build</button><button id="graph-open">Open voting</button><button id="graph-close">Close voting</button></div><p id="graph-status" role="status"></p>';
  query(".desk-grid", document).before(panel);
  const $ = byId;
  const liveToggle = document.createElement("button");
  liveToggle.id = "live-toggle";
  liveToggle.setAttribute("aria-pressed", "false");
  liveToggle.textContent = "Live off";
  liveToggle.title =
    "Off: audience waits while you prepare privately. On: broadcast the selected slide.";
  query(".mode-switch", document).append(liveToggle);
  const followers = document.createElement("span");
  followers.id = "audience-followers";
  followers.className = "small muted";
  followers.title =
    "Active browsers seen in the last 45 seconds. Multiple tabs share an identity; hidden tabs expire. Embedded debug views are excluded. This is not an exact headcount.";
  liveToggle.after(followers);
  $("prepare-mode").hidden = true;
  $("present-mode").hidden = true;
  let liveChanging = false;
  liveToggle.onclick = async () => {
    if (liveChanging) return;
    liveChanging = true;
    liveToggle.disabled = true;
    try {
      await run("presentation/live", { live: !data?.live });
    } finally {
      liveChanging = false;
      liveToggle.disabled = !data?.presentation;
    }
  };
  const syncLive = () => {
    const on = document.body.classList.contains("presenting");
    liveToggle.textContent = on ? "Live on" : "Live off";
    liveToggle.setAttribute("aria-pressed", String(on));
  };
  $("prepare-mode").addEventListener("click", syncLive);
  $("present-mode").addEventListener("click", syncLive);
  $("prepare-mode").click();
  $("open-stage").textContent = "Stage ↗";
  $("open-stage").title = "Open projected stage";
  $("open-stage").setAttribute("aria-label", "Open projected stage");
  const details = document.createElement("details");
  details.id = "presentation-details";
  const summary = document.createElement("summary");
  summary.textContent = "Notes";
  details.append(summary);
  const notes = document.createElement("section");
  notes.id = "presentation-detail-content";
  details.append(notes);
  panel.append(outline, details);
  notes.append($("graph-notes"), $("graph-prompt"));
  const modelLabel = $("model").closest("label");
  const codexControls = document.createElement("div");
  codexControls.id = "codex-controls";
  codexControls.append(modelLabel!, $("activity"));
  query(".connections-panel", document).append(codexControls);
  notes.append($("requests"));
  const output = document.createElement("details");
  output.id = "build-output";
  const outputSummary = document.createElement("summary");
  outputSummary.textContent = "Build output";
  output.append(
    outputSummary,
    $("messages"),
    $("preview-shortcuts"),
    $("back-material"),
  );
  notes.append(output);
  const timingPanel = document.createElement("details");
  timingPanel.id = "build-timings";
  timingPanel.innerHTML =
    '<summary>Build timings</summary><p>Recent attempts · preview time means a URL was detected, not that the demo passed its checks. Compare the same task and prompt across models.</p><button type="button">Download timing history</button><p role="status"></p><div class="timing-scroll"><table><caption>Last 20 build attempts</caption><thead><tr><th>Build / started</th><th>Model</th><th>Outcome</th><th>First preview</th><th>Total</th></tr></thead><tbody></tbody></table></div>';
  notes.append(timingPanel);
  query("button", timingPanel).onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data.buildTimings, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lecture-build-timings.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  let timingKey = "";
  const stagePanel = $("current-stage-panel");
  $("graph-detours").before(stagePanel);
  const updatePollMonitor = mountPollMonitor(stagePanel);
  const demoController = document.createElement("section");
  demoController.id = "web-demo-controller";
  demoController.hidden = true;
  demoController.innerHTML =
    '<h2></h2><p class="small muted">Demo controls · changes follow on the projector while Live is on.</p><div class="web-demo-controls-frame"></div><button type="button">Reset demo</button><p class="web-demo-status" role="status"></p>';
  stagePanel.before(demoController);
  let sendingDemo = false;
  let pendingDemo: { id: string; state: string } | undefined;
  const sendDemoState = async (state: string) => {
    const demo = data?.presentation?.webDemo;
    if (!demo) return;
    pendingDemo = { id: demo.id, state };
    if (sendingDemo) return;
    sendingDemo = true;
    try {
      while (pendingDemo) {
        const value = pendingDemo;
        pendingDemo = undefined;
        update(await call("presentation/demo-state", value));
      }
      query(".web-demo-status", demoController).textContent = "";
    } catch (caught) {
      pendingDemo = undefined;
      query(".web-demo-status", demoController).textContent =
        asError(caught).message;
    } finally {
      sendingDemo = false;
    }
  };
  query("button", demoController).onclick = () => void sendDemoState("{}");
  const projectionStatus = document.createElement("span");
  projectionStatus.id = "projection-status";
  projectionStatus.className = "small muted";
  projectionStatus.setAttribute("role", "status");
  $("graph-next").parentElement!.append(projectionStatus);
  $("graph-next").parentElement!.append($("live-progress"));
  const skipDemo = document.createElement("button");
  skipDemo.id = "skip-demo";
  skipDemo.textContent = "Skip demo →";
  skipDemo.title =
    "Continue to the next slide. Any active build keeps running.";
  skipDemo.hidden = true;
  $("graph-next").after(skipDemo);
  const preparedDemo = document.createElement("button");
  preparedDemo.textContent = "Show prepared demo";
  preparedDemo.onclick = () => run("presentation/preview", { prepared: true });
  const generatedDemo = document.createElement("button");
  generatedDemo.textContent = "Show generated demo";
  generatedDemo.onclick = () =>
    run("presentation/preview", { prepared: false });
  skipDemo.after(preparedDemo, generatedDemo);
  const stopBuild = $("interrupt");
  stopBuild.textContent = "Stop build";
  stopBuild.title =
    "Interrupt the active build, preserving its files and the current slide.";
  $("graph-next").parentElement!.append(stopBuild);
  const buildNotice = document.createElement("p");
  buildNotice.id = "background-build-notice";
  buildNotice.className = "small muted";
  buildNotice.role = "status";
  $("graph-status").before(buildNotice);
  query(".section-heading", stagePanel).remove();
  $("graph-detours").remove();
  const picker = document.createElement("div");
  picker.id = "presentation-picker";
  const name = document.createElement("button");
  name.id = "presentation-name";
  name.setAttribute("aria-expanded", "false");
  name.setAttribute("aria-controls", "presentation-setup");
  picker.append(name, setup);
  query(".brand", document).after(picker);
  setup.hidden = true;
  const authoring = document.createElement("div");
  authoring.className = "button-row";
  const editNote = document.createElement("a");
  editNote.textContent = "Edit in Obsidian ↗";
  const reloadNote = document.createElement("button");
  reloadNote.textContent = "Reload from Obsidian";
  reloadNote.title =
    "Load saved edits privately with Live off; resets the lecture session.";
  reloadNote.onclick = async () => {
    if (data?.presentation)
      await run("presentation/load", { path: data.presentation.path });
  };
  const exportNote = document.createElement("button");
  exportNote.textContent = "Download editable Markdown";
  exportNote.onclick = async () => {
    try {
      const { text } = await call("presentation/markdown");
      const url = URL.createObjectURL(
        new Blob([text], { type: "text/markdown" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "lecture.md";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      $("presentation-message").textContent = asError(caught).message;
    }
  };
  const readingCopy = document.createElement("a");
  readingCopy.href = "/slides";
  readingCopy.target = "_blank";
  readingCopy.rel = "noopener";
  readingCopy.textContent = "Preview reading copy ↗";
  authoring.append(editNote, reloadNote, exportNote, readingCopy);
  setup.append(authoring);
  setup.append($("restart-presentation"));
  if (rehearsalControls)
    query(".connections-panel", document).append(rehearsalControls);
  session.remove();
  const closePicker = () => {
    setup.hidden = true;
    name.setAttribute("aria-expanded", "false");
  };
  name.onclick = () => {
    if (data?.presentation && document.body.classList.contains("presenting"))
      return;
    setup.hidden = !setup.hidden;
    name.setAttribute("aria-expanded", String(!setup.hidden));
  };
  picker.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePicker();
      name.focus();
      event.stopPropagation();
    }
  });
  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target as Node)) closePicker();
  });
  const setDetailsMode = () => {
    details.open = true;
  };
  $("prepare-mode").addEventListener("click", setDetailsMode);
  $("present-mode").addEventListener("click", () => {
    closePicker();
    name.disabled = true;
    setDetailsMode();
  });
  $("prepare-mode").addEventListener("click", () => {
    name.disabled = false;
  });
  $("presentations-list").textContent = "Refresh list";
  $("presentation-load").textContent = "Load";
  $("presentation-unload").remove();
  $("reset-lecture").hidden = true;
  $("new-rehearsal").textContent = "Start fresh app workspace…";
  $("restart-presentation").onclick = async () => {
    if (
      !data?.presentation ||
      !confirm(
        "Restart this presentation from its latest Obsidian content? Slide position and decisions will reset. The next Live on prepares a fresh app project; the previous project is retained separately.",
      )
    )
      return;
    if (await run("presentation/load", { path: data.presentation.path }))
      closePicker();
  };
  $("presentation-choice").hidden = true;
  $("presentation-load").hidden = true;
  query("h2", setup).remove();
  let data: DeskState,
    snapshot = "",
    outlineKey = "",
    previewKey = "";
  let refreshing = false,
    initialListRequested = false;
  setInterval(
    asyncHandler(async () => {
      if (
        preparing() ||
        refreshing ||
        data?.presentation?.step.type !== "poll" ||
        data.graphPoll?.snapshot?.status !== "open" ||
        data.graphPoll?.frozen
      )
        return;
      refreshing = true;
      try {
        update(await call("presentation/poll-refresh", {}));
      } catch (caught) {
        const e = asError(caught);
        $("graph-status").textContent = e.message;
      } finally {
        refreshing = false;
      }
    }),
    3000,
  );
  async function run(...[path, ...args]: PresentationCommand) {
    try {
      const result = await call(path, ...args);
      update(result);
      return true;
    } catch (caught) {
      const e = asError(caught);
      $("graph-status").textContent = e.message;
      $("presentation-message").textContent = e.message;
      return false;
    }
  }
  const preparing = () => !document.body.classList.contains("presenting");
  function neighbour(direction: string) {
    const p = data?.presentation;
    if (!p) return;
    const index = p.outline.findIndex((step) => step.id === p.current);
    return p.outline[index + (direction === "next" ? 1 : -1)]?.id;
  }
  let navigating = false;
  async function selectSlide(id: string) {
    if (navigating) return;
    navigating = true;
    try {
      if (await run("presentation/select", { id })) {
        if (!preparing()) await run("presentation/show");
      }
    } finally {
      navigating = false;
    }
  }
  function revealSelectedSlide() {
    const bounds = outline.getBoundingClientRect();
    const top = bounds.top + outline.clientTop,
      bottom = top + outline.clientHeight;
    const offsets = [...all('[aria-current="step"]', outline)].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        button,
        offset:
          rect.top < top
            ? rect.top - top
            : rect.bottom > bottom
              ? rect.bottom - bottom
              : 0,
      };
    });
    if (offsets.length) {
      const selected = offsets.sort(
        (a, b) => Math.abs(a.offset) - Math.abs(b.offset),
      )[0];
      if (!selected) return;
      selected.button.focus({ preventScroll: true });
      outline.scrollTop += selected.offset;
    }
  }
  async function navigate(direction: string, keyboard = false) {
    if (navigating) return;
    navigating = true;
    try {
      if (preparing()) {
        const id = neighbour(direction);
        if (id) await run("presentation/select", { id });
      } else {
        const id = neighbour(direction);
        if (id && (await run("presentation/select", { id })))
          await run("presentation/show");
      }
    } finally {
      if (keyboard) revealSelectedSlide();
      navigating = false;
    }
  }
  document.addEventListener("keydown", (event) => {
    if (
      !data?.presentation ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.target as Element).closest(
        "input,textarea,select,[contenteditable],dialog,[role=dialog],[role=slider],[role=tablist],[role=combobox],#connections",
      )
    )
      return;
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat)
      void navigate(event.key === "ArrowLeft" ? "previous" : "next", true);
  });
  $("presentations-list").onclick = async () => {
    if ($("presentations-list").disabled) return;
    $("presentations-list").disabled = true;
    try {
      const selected =
        $("presentation-choice").value || data?.presentation?.path;
      const { files } = await call("library");
      $("presentation-choice").replaceChildren(
        ...files
          .filter((f) => f.path.includes("/Presentations/"))
          .map(
            (f) =>
              new Option(
                (f.label.split("/").pop() ?? "").replace(/\.md$/i, ""),
                f.path,
              ),
          ),
      );
      if (
        [...$("presentation-choice").options].some((o) => o.value === selected)
      )
        $("presentation-choice").value = selected ?? "";
      $("presentation-choice").hidden = !$("presentation-choice").options
        .length;
      $("presentation-load").hidden = !$("presentation-choice").options.length;
      $("presentations-list").textContent = "Refresh list";
      $("presentation-message").textContent = $("presentation-choice").options
        .length
        ? ""
        : "No presentations found.";
    } catch (caught) {
      const e = asError(caught);
      $("presentation-message").textContent = e.message;
    } finally {
      $("presentations-list").disabled = false;
    }
  };
  $("presentation-load").onclick = async () => {
    if (
      await run("presentation/load", { path: $("presentation-choice").value })
    ) {
      closePicker();
      name.focus({ preventScroll: true });
    }
  };
  for (const [id, label, op] of [
    ["question", "Project question", "poll-question"],
    ["results", "Project results", "poll-results"],
  ] as const) {
    const button = document.createElement("button");
    button.id = "graph-" + id;
    button.textContent = label;
    $("graph-close").after(button);
    button.onclick = () => run(`presentation/${op}`);
  }
  const syncNotice = document.createElement("span");
  syncNotice.role = "status";
  syncNotice.className = "small muted";
  $("graph-status").after(syncNotice);
  for (const [id, op] of [
    ["previous", "previous"],
    ["return", "return"],
    ["defaults", "defaults"],
    ["open", "poll-open"],
    ["close", "poll-close"],
  ] as const)
    $("graph-" + id).onclick = () => run(`presentation/${op}`);
  $("graph-next").onclick = () => navigate("next");
  skipDemo.onclick = () => navigate("next");
  $("graph-previous").onclick = () => navigate("previous");
  $("graph-build").onclick = () =>
    run("presentation/build", {
      model: $("model").value,
      retry: $("graph-build").textContent === "Retry this build",
    });
  return (value: DeskState) => {
    data = value;
    const authoredDemo = data.presentation?.webDemo;
    demoController.hidden = !authoredDemo;
    stagePanel.classList.toggle("has-demo-controller", !!authoredDemo);
    if (authoredDemo) {
      query("h2", demoController).textContent = data.presentation!.step.title;
      renderWebDemo(
        query(".web-demo-controls-frame", demoController),
        authoredDemo,
        (state) => void sendDemoState(state),
      );
    }
    updatePollMonitor(data);
    const nextTimingKey =
      JSON.stringify(data.buildTimings) + Math.floor(Date.now() / 1000);
    if (timingKey !== nextTimingKey) {
      timingKey = nextTimingKey;
      const elapsed = (start: string, end: string | null) =>
        end
          ? `${Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000).toFixed(1)} s`
          : "—";
      query("[role=status]", timingPanel).textContent =
        data.buildTimingWarning ||
        (data.buildTimings.length
          ? "Saved locally · last 200 attempts"
          : "No build attempts recorded yet.");
      const rows = data.buildTimings
        .slice(-20)
        .reverse()
        .map((run) => {
          const row = document.createElement("tr");
          row.title = `Task: ${run.step} · Prompt fingerprint: ${run.promptHash}`;
          for (const value of [
            run.title + " · " + new Date(run.startedAt).toLocaleString(),
            run.model,
            run.outcome,
            elapsed(run.startedAt, run.previewAt),
            elapsed(
              run.startedAt,
              run.finishedAt ||
                (run.outcome === "running" ? new Date().toISOString() : null),
            ),
          ]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
          }
          return row;
        });
      query("tbody", timingPanel).replaceChildren(...rows);
    }
    followers.textContent =
      data.audienceSync.active == null
        ? "Following: unavailable"
        : `${data.audienceSync.active} following`;
    const p = data.presentation;
    authoring.hidden = !p;
    editNote.href = "obsidian://open?file=" + encodeURIComponent(p?.path || "");
    reloadNote.disabled = !!data.live || !!data.codex.turnId;
    syncNotice.textContent =
      data.audienceSync?.error || data.audienceSync?.readiness || "";
    if (!initialListRequested && data.libraryStatus?.startsWith("Connected")) {
      initialListRequested = true;
      $("presentations-list").click();
    }
    for (const id of ["question", "results"])
      $("graph-" + id).hidden = p?.step.type !== "poll";
    if (document.body.classList.contains("presenting") !== !!data.live)
      (data.live ? $("present-mode") : $("prepare-mode")).click();
    liveToggle.disabled = !p || liveChanging;
    syncLive();
    if (data.rehearsalJob.status === "creating")
      liveToggle.textContent = "Preparing fresh app…";
    document.body.classList.toggle("using-presentation", !!p);
    panel.hidden = !p;
    name.textContent = p?.title || "Choose presentation";
    name.title = name.textContent;
    name.disabled = document.body.classList.contains("presenting") && !!p;
    $("restart-presentation").disabled = !p;
    outline.hidden = !p;
    const key = JSON.stringify([p?.loadedAt, p?.outline]);
    if (key !== outlineKey) {
      outlineKey = key;
      outline.replaceChildren();
      if (!p) {
        snapshot = "";
        return;
      }
      for (const [index, step] of p.outline.entries()) {
        const button = document.createElement("button");
        button.className = "outline-step";
        button.dataset.stepId = step.id;
        button.textContent = index + 1 + ". " + step.title;
        button.setAttribute(
          "aria-label",
          "Slide " + (index + 1) + ": " + step.title,
        );
        button.onclick = () => selectSlide(step.id);
        outline.append(button);
      }
    }
    if (!p) return;
    const shown = data.projection;
    const preview = preparing() || !shown ? p.preview : shown;
    const kind = shown?.blank
      ? "Blank"
      : {
          question: "Question",
          poll: "Poll",
          results: "Results",
          material: "Slide",
          brief: "Build prompt",
          demo: "App",
          diagram: "Diagram",
        }[shown?.projectionKind as "question"] || "Slide";
    projectionStatus.textContent = preparing()
      ? "Private preview · audience waiting"
      : "On stage: " + kind;
    projectionStatus.title = shown?.title || "";
    for (const id of ["question", "results"]) {
      ($("graph-" + id) as HTMLButtonElement).disabled = !data.live;
      $("graph-" + id).setAttribute(
        "aria-pressed",
        String(
          data.live &&
            shown?.projectionKind === (id === "question" ? "poll" : id) &&
            shown?.title === p.step.poll?.question,
        ),
      );
    }
    applyTheme(
      $("current-stage"),
      preparing() ? p.theme : shown?.theme || p.theme,
    );
    for (const button of all("[data-step-id]", outline))
      button.setAttribute(
        "aria-current",
        button.dataset.stepId === p.current ? "step" : "false",
      );
    const nextPreview = JSON.stringify({ ...preview, build: undefined });
    if (nextPreview !== previewKey) {
      previewKey = nextPreview;
      $("current-stage").classList.toggle(
        "stage-blank-preview",
        !!preview.blank,
      );
      renderSlidePreview($("current-stage"), preview);
    }
    if (snapshot !== p.loadedAt) {
      snapshot = p.loadedAt;
      setDetailsMode();
    }
    if (data.codex.requests?.length) details.open = true;
    $("presentation-choice").title = "Loaded: " + p.title + " · " + p.loadedAt;
    $("graph-label").textContent = p.step.chapter || "";
    $("graph-title").textContent = p.step.title;
    $("graph-title").classList.add("sr-only");
    $("graph-notes").textContent = p.step.notes || "";
    $("graph-notes").hidden = !p.step.notes;
    $("graph-prompt").hidden = p.step.type !== "build";
    $("graph-prompt").textContent = p.resolved.prompt;
    $("graph-next").textContent = "Next →";
    $("graph-next").disabled = !neighbour("next");
    skipDemo.hidden = !p.step.previewOf;
    skipDemo.disabled = !neighbour("next");
    preparedDemo.hidden = !p.demo?.prepared;
    generatedDemo.hidden = !p.step.previewOf;
    preparedDemo.disabled = !data.live;
    generatedDemo.disabled = !data.live || !p.demo?.generated;
    preparedDemo.setAttribute(
      "aria-pressed",
      String(p.demo?.selected === "prepared"),
    );
    generatedDemo.setAttribute(
      "aria-pressed",
      String(p.demo?.selected === "generated"),
    );
    const building =
      !!data.codex.turnId ||
      ["working", "running", "waiting"].includes(data.codex.status);
    const activeRun = p.runs.findLast((r) => r.status === "running");
    const buildTitle = p.outline.find((s) => s.id === activeRun?.step)?.title;
    stopBuild.hidden = !building;
    buildNotice.hidden = !building;
    buildNotice.textContent = building
      ? `${buildTitle || "Build"} is still active. Continue through the slides or skip this demo; generation keeps running. To start another build, stop this one and wait for it to finish stopping.`
      : "";
    $("graph-previous").textContent = "← Previous";
    $("graph-previous").disabled = !neighbour("previous");
    $("graph-return").hidden = true;
    $("graph-defaults").hidden = !p.resolved.missing.length;
    $("graph-build").hidden = p.step.type !== "build";
    const latestRun = p.runs.findLast((r) => r.step === p.current);
    const retryable =
      latestRun &&
      ["failed", "interrupted"].includes(latestRun.status ?? "running");
    $("graph-build").textContent = retryable
      ? "Retry this build"
      : "Start this build";
    $("graph-build").disabled =
      p.resolved.missing.length > 0 ||
      data.codex.status !== "ready" ||
      (!!latestRun && !retryable);
    $("graph-open").textContent = data.graphPoll?.frozen
      ? "Reopen voting"
      : "Open voting";
    for (const id of ["open", "close"]) {
      $("graph-" + id).hidden =
        p.step.type !== "poll" ||
        (id === "open" && data.graphPoll?.snapshot?.status === "open");
      ($("graph-" + id) as HTMLButtonElement).disabled =
        !data.graphPoll?.configured ||
        !!data.graphPoll?.busy ||
        (id === "open"
          ? !data.live || data.graphPoll?.snapshot?.status === "open"
          : !!data.graphPoll?.frozen ||
            data.graphPoll?.snapshot?.status !== "open");
    }
  };
}
