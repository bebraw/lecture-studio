import { all, query } from "./dom.ts";
function reload(id: string) {
  const frame = document.getElementById(id);
  if (frame instanceof HTMLIFrameElement) frame.setAttribute("src", frame.src);
}
for (const button of all("button[data-reload]", document))
  button.addEventListener("click", () => reload(button.dataset.reload!));
query("#reload-all", document).addEventListener("click", () => {
  for (const id of ["desk", "stage", "live"]) reload(id);
});
