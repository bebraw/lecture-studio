import type { MountOptions, ApiResponse } from "../shared/api.ts";

export function mountSourceBrowser({ call, update }: MountOptions) {
  const trigger = document.createElement("button");
  trigger.id = "inspect-source";
  trigger.textContent = "Inspect source";
  document.querySelector(".top-actions")!.append(trigger);
  const dialog = document.createElement("dialog");
  dialog.className = "source-browser";
  dialog.setAttribute("aria-labelledby", "source-heading");
  dialog.innerHTML = `<header><h2 id="source-heading">Application source</h2><button data-close>Close</button></header>
    <p>Browse privately. Only the selected lines are shared when you choose Show on stage.</p>
    <div class="source-toolbar"><label>File <select aria-label="Source file"></select></label><button data-reload>Reload files</button></div>
    <p role="status"></p><pre class="source-code" tabindex="0" aria-label="Read-only application source"></pre>
    <div class="source-toolbar"><label>From line <input type="number" min="1" value="1" data-start></label><label>To line <input type="number" min="1" value="12" data-end></label><button data-show disabled>Show on stage</button><button data-return>Return to slide</button></div>
    <p class="small">Up to 12 lines per slide. Review the excerpt below before sharing.</p><pre class="source-excerpt" aria-label="Selected excerpt"></pre>`;
  document.body.append(dialog);
  const select = dialog.querySelector("select")!;
  const status = dialog.querySelector<HTMLElement>('[role="status"]')!;
  const code = dialog.querySelector<HTMLElement>(".source-code")!;
  const excerpt = dialog.querySelector<HTMLElement>(".source-excerpt")!;
  const start = dialog.querySelector<HTMLInputElement>("[data-start]")!;
  const end = dialog.querySelector<HTMLInputElement>("[data-end]")!;
  const show = dialog.querySelector<HTMLButtonElement>("[data-show]")!;
  let file: ApiResponse<`source/file?path=${string}`> | undefined;
  let sequence = 0;
  function selection() {
    const lines = file?.text.split(/\r?\n/) || [];
    const a = start.valueAsNumber,
      b = end.valueAsNumber;
    const valid =
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 1 &&
      b >= a &&
      b <= lines.length &&
      b - a < 12;
    excerpt.textContent = valid
      ? lines
          .slice(a - 1, b)
          .map((line, i) => `${a + i}  ${line}`)
          .join("\n")
      : "Select between 1 and 12 lines.";
    show.disabled = !file || !valid;
  }
  async function run(action: () => Promise<void>) {
    status.textContent = "";
    try {
      await action();
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Source unavailable";
    }
  }
  async function read() {
    const current = ++sequence;
    file = undefined;
    show.disabled = true;
    code.replaceChildren();
    excerpt.textContent = "";
    if (!select.value) return;
    const result = await call(
      `source/file?path=${encodeURIComponent(select.value)}`,
    );
    if (current !== sequence) return;
    file = result;
    // Construct highlighted tokens as text nodes; source never becomes executable HTML.
    const tokens =
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\b(?:import|export|from|const|let|return|async|await|function|if|else|class|new|throw|true|false|null)\b)/g;
    result.text.split(/\r?\n/).forEach((line, i) => {
      const row = document.createElement("span");
      row.className = "source-line";
      const number = document.createElement("span");
      number.className = "source-line-number";
      number.textContent = String(i + 1);
      row.append(number);
      for (const token of line.split(tokens)) {
        const span = document.createElement("span");
        span.textContent = token;
        if (/^["']/.test(token)) span.className = "source-string";
        else if (token.startsWith("//")) span.className = "source-comment";
        else if (
          /^(import|export|from|const|let|return|async|await|function|if|else|class|new|throw|true|false|null)$/.test(
            token,
          )
        )
          span.className = "source-keyword";
        row.append(span);
      }
      code.append(row);
    });
    start.value = "1";
    end.value = String(Math.min(12, result.text.split(/\r?\n/).length));
    selection();
  }
  async function load() {
    ++sequence;
    file = undefined;
    show.disabled = true;
    const previous = select.value;
    const result = await call("source/files");
    select.replaceChildren(
      ...result.files.map((path) => new Option(path, path)),
    );
    if (result.files.includes(previous)) select.value = previous;
    await read();
    status.textContent = result.truncated
      ? "File list limited. Generated and hidden files are omitted."
      : result.files.length
        ? "Files from the active application workspace."
        : "No source files yet. Connect Codex and build the app first.";
  }
  trigger.onclick = () => {
    dialog.showModal();
    void run(load);
  };
  dialog.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () =>
    dialog.close();
  dialog.addEventListener("close", () => trigger.focus());
  dialog.querySelector<HTMLButtonElement>("[data-reload]")!.onclick = () => {
    void run(load);
  };
  select.onchange = () => {
    void run(read);
  };
  start.oninput = end.oninput = selection;
  show.onclick = () => {
    void run(async () => {
      if (!file) return;
      update(
        await call("source/show", {
          path: file.path,
          revision: file.revision,
          start: start.valueAsNumber,
          end: end.valueAsNumber,
        }),
      );
      status.textContent =
        "Selected excerpt is on Stage and Live. Return to slide when finished.";
    });
  };
  dialog.querySelector<HTMLButtonElement>("[data-return]")!.onclick = () => {
    void run(async () => {
      update(await call("source/return"));
      dialog.close();
    });
  };
}
