import { applyTheme, renderSurface, renderDiagrams, escape } from "./shared.ts";
import { identityHtml, identityTopLogoHtml } from "../shared/identity.ts";
import type { PdfSlide } from "../shared/pdf.ts";

window.renderPdf = async (slides: PdfSlide[]) => {
  for (const slide of slides) {
    const root = document.createElement("section");
    root.className = "stage pdf-slide";
    root.dataset.slide = slide.id;
    root.style.setProperty(
      "--identity-logo-scale",
      String(slide.stage.identity?.logoScale ?? 1),
    );
    const identity = identityHtml(slide.stage.identity, "stage");
    const publicIdentity =
      slide.mode === "publication"
        ? identity
            .replace(">Join the audience<span>", ">Further reading<span>")
            .replace(
              'alt="Scan to join the audience"',
              'alt="Scan for further reading"',
            )
        : identity;
    const logo = identityTopLogoHtml(slide.stage.identity);
    root.innerHTML = `<header><span>${escape(slide.stage.act || "")}</span>${logo ? `<div class="identity-top-logo">${logo}</div>` : ""}</header><main class="pdf-content stage-surface"></main>${publicIdentity}<footer class="pdf-footer"><span>${escape(slide.stage.source || "")}</span><span>${escape(slide.label)}</span></footer>`;
    document.body.append(root);
    applyTheme(root, slide.stage.theme);
    const content = root.querySelector<HTMLElement>("main")!;
    renderSurface(content, slide.stage);
    await renderDiagrams(content);
    if (content.querySelector("code.language-mermaid"))
      throw new Error(
        `Slide ${slide.id}: diagram failed to render; check the Mermaid source`,
      );
    await document.fonts.ready;
    await Promise.all(
      [...root.querySelectorAll("img")].map(async (image) => {
        try {
          await image.decode();
        } catch {
          throw new Error(
            `Slide ${slide.id}: image failed to load (${image.alt})`,
          );
        }
      }),
    );
    // Inspect reserved hidden reveal geometry as well as currently visible content.
    const canvas = root.getBoundingClientRect();
    const main = content.getBoundingClientRect();
    const footer = root.querySelector("footer")!.getBoundingClientRect();
    for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      if (element.closest("svg")) continue;
      const box = element.getBoundingClientRect();
      if (!box.width && !box.height) continue;
      if (
        box.left < canvas.left - 1 ||
        box.right > canvas.right + 1 ||
        box.top < canvas.top - 1 ||
        box.bottom > canvas.bottom + 1 ||
        (element.scrollWidth > element.clientWidth + 2 &&
          getComputedStyle(element).display !== "inline") ||
        (element.scrollHeight > element.clientHeight + 2 &&
          getComputedStyle(element).overflowY === "hidden")
      )
        throw new Error(
          `Slide ${slide.id}: content exceeds the slide boundaries (${element.tagName.toLowerCase()}: ${(element.textContent || "").trim().slice(0, 60)}). Shorten the content or choose a different aspect ratio.`,
        );
      if (
        content.contains(element) &&
        element !== content &&
        (box.top < main.top - 1 ||
          box.bottom > Math.min(main.bottom, footer.top) + 1)
      )
        throw new Error(
          `Slide ${slide.id}: content overlaps the header or footer. Shorten the content.`,
        );
    }
  }
};
