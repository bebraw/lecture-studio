export function applyReveals(root: HTMLElement, current: number) {
  for (const block of root.querySelectorAll<HTMLElement>(
    "[data-reveal-step]",
  )) {
    const pending = Number(block.dataset.revealStep) > current;
    block.classList.toggle("reveal-pending", pending);
    block.inert = pending;
    if (pending) block.setAttribute("aria-hidden", "true");
    else block.removeAttribute("aria-hidden");
  }
  for (const row of root.querySelectorAll<HTMLElement>(
    "[data-reveal-emphasis]",
  )) {
    const active = row.dataset
      .revealEmphasis!.split(" ")
      .includes(String(current));
    row.classList.toggle("reveal-row-current", active);
    if (active) row.setAttribute("aria-current", "step");
    else row.removeAttribute("aria-current");
  }
}
