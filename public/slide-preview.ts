import type { Stage } from "../shared/models.ts";
import {
  applyTheme,
  createStageStatus,
  renderDiagrams,
  renderSurface,
} from "./shared.ts";

const previews = new WeakMap<HTMLElement, (stage: Partial<Stage>) => void>();

/** A real slide viewport keeps desk styles and dimensions out of the slide. */
export function renderSlidePreview(host: HTMLElement, stage: Partial<Stage>) {
  const existing = previews.get(host);
  if (existing) return existing(stage);
  const frame = document.createElement("iframe");
  frame.title = "Slide preview";
  frame.className = "slide-preview-frame";
  frame.srcdoc =
    '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body class="stage"><header class="stage-top"><span>WEB DEVELOPMENT / 2026</span><span id="era"></span></header><main id="stage-content" class="stage-surface"></main><footer class="stage-bottom"><a id="student-link" href="https://live.scalableweb.dev" target="_blank" rel="noopener noreferrer">live.scalableweb.dev</a><span id="source-credit"></span><span id="build-signal"></span></footer></body></html>';
  let latest = stage;
  let updateStatus: ReturnType<typeof createStageStatus> | undefined;
  const render = () => {
    const doc = frame.contentDocument;
    if (!doc?.querySelector("#stage-content") || !updateStatus) return;
    applyTheme(doc.body, latest.theme);
    doc.body.classList.toggle("blank", !!latest.blank);
    const content = doc.querySelector<HTMLElement>("#stage-content")!;
    renderSurface(content, latest);
    content.dataset.mode = latest.mode;
    doc.querySelector("#era")!.textContent = (latest.act || "")
      .replaceAll("-", " ")
      .toUpperCase();
    doc.querySelector("#source-credit")!.textContent = latest.source || "";
    updateStatus(latest);
    void renderDiagrams(content);
  };
  frame.onload = () => {
    updateStatus = createStageStatus(frame.contentDocument!);
    render();
  };
  host.classList.add("slide-preview-host");
  host.replaceChildren(frame);
  const resize = () => {
    const scale = Math.min(host.clientWidth / 1920, host.clientHeight / 1080);
    frame.style.transform = `scale(${scale})`;
    frame.style.left = `${(host.clientWidth - 1920 * scale) / 2}px`;
    frame.style.top = `${(host.clientHeight - 1080 * scale) / 2}px`;
  };
  new ResizeObserver(resize).observe(host);
  resize();
  previews.set(host, (value) => {
    latest = value;
    render();
  });
}
