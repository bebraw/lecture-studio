import type { PresentationDefinition } from "../shared/models.ts";
import type { PdfSlide } from "../shared/pdf.ts";
import { renderMarkdown } from "./material.ts";
import {
  imageSources,
  posterMarkdown,
  presentationIdentity,
} from "./presentation-images.ts";

// Public fields only: never pass a Step, session snapshot or full definition to Chromium.
export function pdfSlides(deck: PresentationDefinition): PdfSlide[] {
  return deck.steps.map((step, index) => {
    if (
      (step.demo || step.previewOf || step.teachingDemo || step.layersDemo) &&
      !step.demoPoster
    )
      throw new Error(
        `Slide ${step.id}: provide a demoPoster for static export`,
      );
    const html = renderMarkdown(
      step.type === "build"
        ? "Live demonstration · implementation instructions omitted."
        : (step.body || "") + posterMarkdown(step),
      {
        imageSources: imageSources(step),
        reveals: step.reveals,
      },
    );
    if (html.includes('class="image-notice"'))
      throw new Error(
        `Slide ${step.id}: an image is unavailable; use a local ./ image asset`,
      );
    return {
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
  });
}
