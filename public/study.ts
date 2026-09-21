import { applyReveals } from "./reveals.ts";
import * as v from "valibot";
import {
  studyCourseSchema,
  studyModuleSchema,
  type StudyModule,
} from "../shared/study.ts";
import { renderWebDemo } from "./web-demo.ts";
import { asError } from "../shared/errors.ts";

const savedSchema = v.object({
  last: v.string(),
  completed: v.array(v.string()),
  demos: v.record(v.string(), v.string()),
  choices: v.record(v.string(), v.string()),
  reveals: v.optional(
    v.record(
      v.string(),
      v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(20)),
    ),
    {},
  ),
});
type Saved = v.InferOutput<typeof savedSchema>;
const keyFor = (course: string, module: string, revision: string) =>
  `lecture-study:${course}:${module}:${revision}`;
const status = (message: string) => {
  const node = document.querySelector("#storage-status");
  if (node) node.textContent = message;
};
function load(key: string): Saved {
  try {
    const result = v.safeParse(
      savedSchema,
      JSON.parse(localStorage.getItem(key) || "null"),
    );
    if (result.success) return result.output;
  } catch {
    status(
      "Browser storage is unavailable. You can still explore; progress will last for this page only.",
    );
  }
  return { last: "", completed: [], demos: {}, choices: {}, reveals: {} };
}
async function diagrams(root: HTMLElement) {
  const blocks = [
    ...root.querySelectorAll<HTMLElement>("code.language-mermaid"),
  ];
  if (!blocks.length) return;
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      flowchart: { htmlLabels: false },
      suppressErrorRendering: true,
    });
    for (const block of blocks) {
      const { svg } = await mermaid.render(
        "study-" + crypto.randomUUID(),
        block.textContent || "",
      );
      const holder = document.createElement("div");
      holder.className = "study-diagram";
      holder.innerHTML = svg;
      block.closest("pre")?.replaceWith(holder);
    }
  } catch {
    /* Keep readable diagram source if rendering fails. */
  }
}
function mountModule(module: StudyModule) {
  const key = keyFor(module.courseId, module.id, module.revision);
  const saved = load(key);
  let reading = false;
  const updateReveals = new Map<string, () => void>();
  const validIds = new Set(module.steps.map((step) => step.id));
  saved.completed = [
    ...new Set(saved.completed.filter((id) => validIds.has(id))),
  ];
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {
      status(
        "Could not save progress. This page still works, but changes may not survive reload.",
      );
    }
  };
  const element = <T extends HTMLElement>(selector: string) =>
    document.querySelector<T>(selector)!;
  const section = (id: string) => document.getElementById("slide-" + id)!;
  const updateProgress = () => {
    element("#study-progress").textContent =
      `${saved.completed.length} of ${module.steps.length} sections complete`;
    for (const step of module.steps) {
      const complete = section(step.id).querySelector<HTMLButtonElement>(
        ".complete-step",
      )!;
      const done = saved.completed.includes(step.id);
      complete.textContent = done ? "Completed ✓" : "Mark as complete";
      complete.setAttribute("aria-pressed", String(done));
    }
  };
  const select = (id: string, focus = false) => {
    const index = module.steps.findIndex((step) => step.id === id);
    if (index < 0) return;
    saved.last = id;
    save();
    for (const step of module.steps) {
      section(step.id).hidden = !reading && step.id !== id;
      updateReveals.get(step.id)?.();
      element(`[data-step-link="${step.id}"]`).setAttribute(
        "aria-current",
        step.id === id ? "step" : "false",
      );
    }
    element<HTMLButtonElement>("#study-previous").disabled = index === 0;
    element("#study-next").hidden = index === module.steps.length - 1;
    element("#module-end").hidden = index !== module.steps.length - 1;
    if (focus) section(id).focus({ preventScroll: false });
    void diagrams(section(id));
  };
  for (const step of module.steps) {
    const root = section(step.id);
    if (step.revealTotal) {
      const total = step.revealTotal;
      saved.reveals[step.id] = Math.min(total, saved.reveals[step.id] || 0);
      const controls = document.createElement("div");
      controls.className = "reveal-controls";
      controls.innerHTML =
        '<button type="button">Previous reveal</button><span role="status"></span><button type="button">Next reveal</button>';
      root.querySelector(".prose")!.before(controls);
      const [previous, next] = controls.querySelectorAll("button");
      const refresh = () => {
        const current = saved.reveals[step.id] || 0;
        controls.hidden = reading;
        applyReveals(root, reading ? total : current);
        controls.querySelector("span")!.textContent =
          "Reveal " + current + " / " + total;
        previous!.disabled = current === 0;
        next!.disabled = current === total;
      };
      for (const [button, delta] of [
        [previous!, -1],
        [next!, 1],
      ] as const)
        button.onclick = () => {
          saved.reveals[step.id] = Math.max(
            0,
            Math.min(total, (saved.reveals[step.id] || 0) + delta),
          );
          refresh();
          save();
        };
      updateReveals.set(step.id, refresh);
      refresh();
    }
    const complete = root.querySelector<HTMLButtonElement>(".complete-step")!;
    complete.hidden = false;
    complete.onclick = () => {
      saved.completed = saved.completed.includes(step.id)
        ? saved.completed.filter((id) => id !== step.id)
        : [...saved.completed, step.id];
      save();
      updateProgress();
    };
    for (const radio of root.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    )) {
      radio.checked = saved.choices[step.id] === radio.value;
      radio.onchange = () => {
        saved.choices[step.id] = radio.value;
        save();
        const result = root.querySelector(".answer-result");
        if (result) result.textContent = "";
      };
    }
    const check = root.querySelector<HTMLButtonElement>(".check-answer");
    if (check) {
      check.hidden = false;
      check.onclick = () => {
        const selected = saved.choices[step.id];
        root.querySelector(".answer-result")!.textContent = !selected
          ? "Choose an answer first."
          : selected === step.activity?.correctOption
            ? "Correct. Read the discussion to check your reasoning."
            : "Not quite. Try again or reveal the discussion.";
      };
    }
    if (step.demo) {
      const host = root.querySelector<HTMLElement>(".demo-host")!;
      const reset = root.querySelector<HTMLButtonElement>(".reset-demo")!;
      const demoStatus = root.querySelector<HTMLElement>(".demo-status")!;
      host.addEventListener("demo-status", () => {
        const state = host.dataset.demoStatus;
        reset.hidden = state !== "ready";
        demoStatus.textContent =
          state === "ready"
            ? ""
            : state === "error"
              ? "The interactive demo could not start. The reading content remains available. Reload the page to try again."
              : "Loading interactive demo…";
      });
      const view = {
        id: module.id + ":" + step.id,
        url: step.demo.url,
        state: saved.demos[step.id] || "{}",
      };
      try {
        const value: unknown = JSON.parse(view.state);
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          new TextEncoder().encode(view.state).length > 16000
        )
          view.state = "{}";
      } catch {
        view.state = "{}";
      }
      const change = (state: string) => {
        try {
          const value: unknown = JSON.parse(state);
          if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            new TextEncoder().encode(state).length > 16000
          )
            throw new Error(
              "Demo state must be a JSON object smaller than 16 KB",
            );
          view.state = JSON.stringify(value);
          saved.demos[step.id] = view.state;
          save();
          renderWebDemo(host, view, change);
        } catch (error) {
          status(asError(error).message);
        }
      };
      renderWebDemo(host, view, change);
      reset.onclick = () => change("{}");
    }
  }
  element(".step-navigation").hidden = false;
  for (const [id, delta] of [
    ["study-previous", -1],
    ["study-next", 1],
  ] as const)
    element<HTMLButtonElement>("#" + id).onclick = () => {
      const step =
        module.steps[
          module.steps.findIndex((step) => step.id === saved.last) + delta
        ];
      if (step) location.hash = "slide-" + step.id;
    };
  const readingButton = element<HTMLButtonElement>("#reading-mode");
  readingButton.hidden = false;
  readingButton.onclick = () => {
    reading = !reading;
    readingButton.textContent = reading
      ? "Show one section at a time"
      : "Show all sections";
    select(saved.last);
    if (reading) void diagrams(element("#main"));
  };
  const reset = element<HTMLButtonElement>("#reset-progress");
  reset.hidden = false;
  reset.onclick = () => {
    saved.completed = [];
    save();
    updateProgress();
  };
  window.addEventListener("hashchange", () =>
    select(location.hash.replace(/^#slide-/, ""), true),
  );
  updateProgress();
  const requested = location.hash.replace(/^#slide-/, "");
  const first = validIds.has(requested)
    ? requested
    : validIds.has(saved.last)
      ? saved.last
      : module.steps[0]!.id;
  history.replaceState(null, "", "#slide-" + first);
  select(first);
}
async function start() {
  const response = await fetch(document.body.dataset.studyData || "", {
    credentials: "omit",
  });
  if (!response.ok) throw new Error("Could not load the learning module");
  const data: unknown = await response.json();
  if (document.body.dataset.studyKind === "module")
    mountModule(v.parse(studyModuleSchema, data));
  else {
    const course = v.parse(studyCourseSchema, data);
    for (const module of course.modules) {
      const saved = load(keyFor(course.id, module.id, module.revision));
      const row = document.querySelector<HTMLElement>(
        `[data-module="${module.id}"]`,
      )!;
      row.textContent = `${Math.min(saved.completed.length, module.steps)} / ${module.steps} complete`;
      const link = row
        .closest("li")!
        .querySelector<HTMLAnchorElement>(".module-start")!;
      if (saved.last) {
        link.textContent = "Continue →";
        link.href = module.href + "#slide-" + encodeURIComponent(saved.last);
      }
    }
  }
}
void start().catch((error: unknown) =>
  status(
    asError(error).message +
      ". The reading copy remains available below. Serve this export over HTTP.",
  ),
);
