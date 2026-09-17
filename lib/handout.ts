import { imageSources, posterMarkdown } from "./presentation-images.ts";
import { renderMarkdown } from "./material.ts";
import type { PresentationDefinition } from "../shared/models.ts";
export function renderHandout(deck: PresentationDefinition) {
  const escape = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const chapters = new Map<string, string>();
  for (const step of deck.steps)
    if (step.chapter && !chapters.has(step.chapter))
      chapters.set(step.chapter, step.id);
  const citations = (text: string) =>
    escape(text).replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, numbers: string) =>
      numbers
        .split(",")
        .map((n) => `<a href="#reference-${n.trim()}">[${n.trim()}]</a>`)
        .join(" "),
    );
  // Deliberately render public fields only. Never serialize the definition, notes,
  // build instructions, credentials, or any runtime audience/session state.
  const slides = deck.steps
    .map((step, index) => {
      let body = renderMarkdown(
        step.type === "build"
          ? "Live demonstration · implementation instructions omitted from this reading copy."
          : (step.body || "") + posterMarkdown(step),
        {
          allowRemoteImages: step.allowRemoteImages,
          imageSources: imageSources(step),
        },
      );
      if (step.chapter === "References")
        body = body.replace(/<li>\[(\d+)\]/g, '<li id="reference-$1">[$1]');
      const options = step.poll
        ? `<ul>${step.poll.options.map((o) => `<li>${escape(o.label)}</li>`).join("")}</ul>`
        : "";
      const activity =
        step.poll || step.wordCloud
          ? '<p class="activity">Lecture activity · submissions are closed in this reading copy.</p>'
          : "";
      return `<section class="slide${step.type === "title" ? " slide-title" : ""}${step.chapter === "References" ? " slide-references" : ""}" id="${escape(step.id)}"><p class="eyebrow">${escape(step.chapter || "Opening")} · ${index + 1}/${deck.steps.length}</p><h2>${escape(step.title)}</h2>${activity}${body}${options}${step.source ? `<footer>${citations(step.source)}</footer>` : ""}</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(deck.title)} · Slides</title><link rel="stylesheet" href="/slides.css"></head><body>
<header class="intro"><p class="eyebrow">Lecture reading copy</p><h1>${escape(deck.title)}</h1><p>Juho Vepsäläinen</p><p>Revisit the slides, follow the sources, and keep a copy.</p><nav aria-label="Lecture sections">${[...chapters].map(([chapter, id]) => `<a href="#${escape(id)}">${escape(chapter)}</a>`).join(" ")}</nav><button id="print-slides" type="button" hidden>Print / save as PDF</button><noscript><p>Use your browser’s Print command to save a PDF. Diagrams are shown as source text without JavaScript.</p></noscript></header>
<main>${slides}</main><footer class="end">Slides and references · <a href="https://live.scalableweb.dev/slides">live.scalableweb.dev/slides</a><p>Images and excerpts retain their source credits. Live demonstrations and audience responses are not recorded in this copy.</p></footer><script type="module" src="/slides.mjs"></script></body></html>`;
}
