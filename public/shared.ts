import type { Stage, Theme, BuildState } from "../shared/models.ts";
import {
  parseApiResponse,
  validateApiRequest,
  requestSchemas,
  type ApiResponse,
  type ApiPath,
  type ApiArgs,
} from "../shared/api.ts";
import { safeParse } from "valibot";
import { errorSchema } from "../shared/schemas.ts";
import type { Mermaid } from "mermaid";
import { all } from "./dom.ts";
export function applyTheme(element: HTMLElement, theme: Partial<Theme> = {}) {
  for (const [key, variable] of Object.entries({
    background: "paper",
    text: "ink",
    muted: "muted",
    accent: "accent",
    headingFont: "heading-font",
    bodyFont: "body-font",
    codeFont: "code-font",
  })) {
    if (theme[key as keyof Theme])
      element.style.setProperty("--" + variable, theme[key as keyof Theme]!);
    else element.style.removeProperty("--" + variable);
  }
}
export function previewCandidates(
  messages: { text: string }[],
  ownOrigin: string,
) {
  const own = new URL(ownOrigin),
    found = new Set<string>();
  for (const message of messages || []) {
    for (const match of String(message.text || "").matchAll(
      /https?:\/\/[^\s<>"'`]+/g,
    )) {
      try {
        const value = match[0].replace(/[),.;!]+$/, "");
        const url = new URL(value);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
          continue;
        if (
          !url.port ||
          url.port === own.port ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          continue;
        if (/\/(?:api|json|devtools)(?:\/|$)/i.test(url.pathname)) continue;
        found.add(url.href);
      } catch {
        /* Incomplete streamed URLs are not actionable. */
      }
    }
  }
  return [...found].slice(-8);
}
export function buildLabel(build: BuildState) {
  const labels: Record<string, string> = {
    working: build.activity || "Working",
    waiting: "Build paused",
    failed: "Build needs attention",
    ready: build.startedAt ? "Finished" : "Ready · nothing sent",
    disconnected: "Codex disconnected",
    connecting: "Connecting Codex",
  };
  const seconds = build.startedAt
    ? Math.max(
        0,
        Math.floor(((build.finishedAt || Date.now()) - build.startedAt) / 1000),
      )
    : 0;
  const timer = build.startedAt
    ? " · " +
      Math.floor(seconds / 60) +
      ":" +
      String(seconds % 60).padStart(2, "0")
    : "";
  return (
    (build.status === "ready" && build.outcome === "interrupted"
      ? "Interrupted · review partial work"
      : labels[build.status] || "Idle") + timer
  );
}
export const escape = (text: string | number | boolean | null | undefined) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c as "&" | "<" | ">" | '"' | "'"
      ],
  );
export function auth(role: string) {
  const key = "lecture-studio-" + role;
  const token =
    document.querySelector<HTMLMetaElement>('meta[name="lecture-token"]')
      ?.content ||
    location.hash.slice(1) ||
    sessionStorage.getItem(key) ||
    "";
  if (location.hash) {
    sessionStorage.setItem(key, token);
    history.replaceState(null, "", location.pathname);
  }
  return token;
}
export async function api<P extends ApiPath>(
  token: string,
  path: P,
  ...args: ApiArgs<P>
): Promise<ApiResponse<P>> {
  const value =
    args[0] ??
    (path !== "feedback" && Object.hasOwn(requestSchemas, path)
      ? {}
      : undefined);
  if (value !== undefined) validateApiRequest(path, value);
  const response = await fetch("/api/" + path, {
    signal: AbortSignal.timeout(65000),
    headers: {
      Authorization: "Bearer " + token,
      ...(value === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(value === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(value) }),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = safeParse(errorSchema, data);
    throw new Error(error.success ? error.output.error : "Request failed");
  }
  return parseApiResponse(path, data);
}
const diagrams: Record<string, string> = {
  ages: '<div class="diagram ages"><div><span class="diagram-number">01</span><h3>Document</h3><p>Address it.<br>Link to it.<br>Act through a form.</p></div><b aria-hidden="true">→</b><div><span class="diagram-number">02</span><h3>Application</h3><p>Share state.<br>Improve feedback.<br>Keep the core.</p></div><b aria-hidden="true">→</b><div><span class="diagram-number">03</span><h3>Agentic</h3><p>Expose actions.<br>Compose context.<br>Verify the result.</p></div><footer>The capability survives. The interface changes.</footer></div>',
  enhancement:
    '<div class="diagram layers"><div class="layer optional"><span>03</span><strong>JavaScript interaction</strong><em>Convenience</em></div><div class="layer optional"><span>02</span><strong>CSS presentation</strong><em>Expression</em></div><div class="layer core"><span>01</span><strong>Working HTML capability</strong><em>The foundation</em></div><footer>Remove the upper layers. Can you still act?</footer></div>',
  futures:
    '<div class="diagram futures"><div><span class="diagram-number">A / EXTEND</span><h3>Existing applications</h3><p>Richer affordances for people and agents.</p></div><span class="plus">+</span><div><span class="diagram-number">B / COMPOSE</span><h3>Agent-first services</h3><p>Consumer agents assemble an interface around a need.</p></div><footer>Two hypotheses. Neither requires the other to disappear.</footer></div>',
  context:
    '<div class="diagram context"><div><span class="diagram-number">STAYS WITH YOU</span><h3>Personal context</h3><p>Private notes<br>Identity<br>Unshared preferences</p></div><div class="boundary"><span>EXPLICIT<br>SELECTION →</span></div><div><span class="diagram-number">CROSSES THE BOUNDARY</span><h3>Model input</h3><p>Reviewed facts<br>Aggregate choices<br>Allowed actions</p></div><footer>A context receipt makes the boundary inspectable.</footer></div>',
};
export function surface(stage: Partial<Stage>, previewPosition = false) {
  const position = stage.slidePosition;
  const footer =
    previewPosition && position
      ? '<div class="preview-slide-position" aria-label="Slide ' +
        position.number +
        " of " +
        position.total +
        '">' +
        position.number +
        "/" +
        position.total +
        "</div>" +
        (position.progress == null
          ? ""
          : '<progress class="preview-slide-progress" aria-label="Lecture progress" max="1" value="' +
            position.progress +
            '"></progress>')
      : "";
  const heading =
    footer +
    "<h1" +
    (stage.slideType === "title"
      ? ' class="section-title' +
        (stage.title === stage.act ? " chapter-divider" : "") +
        '"'
      : "") +
    ">" +
    escape(stage.title) +
    "</h1>";
  if (stage.mode === "diagram")
    return (
      heading +
      (diagrams[stage.diagram ?? ""] || diagrams.ages) +
      '<div class="stage-copy">' +
      (stage.html || "") +
      "</div>"
    );
  if (stage.mode === "demo")
    return (
      heading +
      (stage.demoUrl
        ? '<iframe title="Live lecture application" src="' +
          escape(stage.demoUrl) +
          '" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerpolicy="no-referrer"></iframe><a class="demo-link" href="' +
          escape(stage.demoUrl) +
          '" target="_blank" rel="noopener noreferrer">Open app separately ↗</a>'
        : '<p class="stage-copy">The app will appear here when it is ready.</p>')
    );
  return (
    heading +
    '<div class="stage-copy ' +
    (stage.mode === "brief" ? "brief-copy" : "") +
    '">' +
    (stage.html || "") +
    "</div>"
  );
}
let mermaid: Mermaid;
export async function renderDiagrams(container: HTMLElement) {
  const blocks = [...all("code.language-mermaid", container)];
  if (!blocks.length) return;
  try {
    mermaid ??= (await import("/vendor/mermaid/mermaid.esm.min.mjs")).default;
    const style = getComputedStyle(container),
      color = (name: string) => style.getPropertyValue("--" + name).trim();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: {
        background: color("paper"),
        primaryColor: color("paper"),
        primaryTextColor: color("ink"),
        primaryBorderColor: color("muted"),
        lineColor: color("muted"),
        secondaryColor: color("accent"),
        tertiaryColor: color("paper"),
        fontFamily: color("body-font"),
      },
      suppressErrorRendering: true,
      flowchart: { htmlLabels: false },
      maxTextSize: 16000,
    });
    for (const block of blocks) {
      const text = block.textContent;
      const parent = block.closest("pre");
      const { svg } = await mermaid.render(
        "diagram" + crypto.randomUUID().replaceAll("-", ""),
        text,
      );
      if (parent?.isConnected) {
        const holder = document.createElement("div");
        holder.className = "mermaid-graphic";
        holder.innerHTML = svg;
        // Opt-in sequence reveals: counts of messages and notes already explained.
        const focus = text.match(/^\s*%% focus-after: (\d+),(\d+)\s*$/m);
        if (focus) {
          for (const [selector, count] of [
            [".messageText", Number(focus[1])],
            [".messageLine0, .messageLine1", Number(focus[1])],
            [".note", Number(focus[2])],
            [".noteText", Number(focus[2])],
          ] as const) {
            holder.querySelectorAll(selector).forEach((element, index) => {
              element.classList.add(
                index < count ? "sequence-context" : "sequence-current",
              );
            });
          }
        }
        parent.replaceWith(holder);
      }
    }
  } catch {
    /* Keep the readable source when a diagram cannot render. */
  }
}
