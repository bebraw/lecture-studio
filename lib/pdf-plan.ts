import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { revealTotal } from "./reveals.ts";
import type { PresentationDefinition } from "../shared/models.ts";
import type { PdfSlide } from "../shared/pdf.ts";
import { renderMarkdown } from "./material.ts";
import {
  imageSources,
  posterMarkdown,
  presentationIdentity,
} from "./presentation-images.ts";

// Public fields only: never pass a Step, session snapshot or full definition to Chromium.
export function pdfSlides(
  deck: PresentationDefinition,
  frames: Record<string, string[]> = {},
): PdfSlide[] {
  return deck.steps.flatMap((step, index) => {
    if (
      (step.demo || step.previewOf || step.teachingDemo || step.layersDemo) &&
      !step.demoPoster &&
      !step.demoSequence
    )
      throw new Error(
        `Slide ${step.id}: provide a demoSequence or demoPoster for static export`,
      );
    const html = renderMarkdown(
      step.type === "build"
        ? "Live demonstration · implementation instructions omitted."
        : (step.body || "") + (step.demoSequence ? "" : posterMarkdown(step)),
      {
        imageSources: imageSources(step),
        reveals: step.reveals,
      },
    );
    if (html.includes('class="image-notice"'))
      throw new Error(
        `Slide ${step.id}: an image is unavailable; use a local ./ image asset`,
      );
    const page: PdfSlide = {
      id: step.id,
      label: `Slide ${index + 1} / ${deck.steps.length}`,
      stage: {
        mode: "material",
        title: step.title,
        html,
        source: step.source || "",
        act: step.chapter || "",
        slideType: step.type,
        theme: deck.theme,
        ...(presentationIdentity(deck, step)
          ? { identity: presentationIdentity(deck, step)! }
          : {}),
        slidePosition: {
          number: index + 1,
          total: deck.steps.length,
          progress: (index + 1) / deck.steps.length,
        },
      },
    };
    if (step.demoSequence)
      return step.demoSequence.map((frame, frameIndex) => {
        const image =
          "image" in frame
            ? imageSources(step)[frame.image]
            : frames[step.id]?.[frameIndex];
        if (!image)
          throw new Error(
            `Slide ${step.id}, frame ${frameIndex + 1}: missing demo visual`,
          );
        const caption = renderMarkdown(frame.caption);
        return {
          ...page,
          label: `${page.label} · Example ${frameIndex + 1} / ${step.demoSequence!.length}`,
          stage: {
            ...page.stage,
            html:
              html +
              `<figure class="pdf-demo-frame"><img src="${image}" alt="Demo state ${frameIndex + 1}"><figcaption>${caption}</figcaption></figure>`,
          },
        };
      });
    const total = revealTotal(html);
    if (!total) return [page];
    const initial = hasInitialContent(parseFragment(html)) ? 0 : 1;
    return Array.from({ length: total - initial + 1 }, (_, offset) => {
      const current = initial + offset;
      return {
        ...page,
        label: `${page.label} · Reveal ${current} / ${total}`,
        stage: { ...page.stage, reveal: { current, total } },
      };
    });
  });
}

function hasInitialContent(node: DefaultTreeAdapterMap["node"]): boolean {
  if (
    "tagName" in node &&
    node.attrs.some((attribute) => attribute.name === "data-reveal-step")
  )
    return false;
  if ("value" in node) return !!node.value.trim();
  if ("tagName" in node && ["img", "svg", "hr"].includes(node.tagName))
    return true;
  return "childNodes" in node && node.childNodes.some(hasInitialContent);
}
