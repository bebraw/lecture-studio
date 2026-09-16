import { renderDiagrams } from "./shared.ts";

const button = document.querySelector<HTMLButtonElement>("#print-slides")!;
// Wait for diagrams before offering a printable copy.
await renderDiagrams(document.querySelector<HTMLElement>("main")!);
button.hidden = false;
button.addEventListener("click", () => window.print());
