import type { ApiClient } from "../shared/api.ts";
import type { Note, NoteFile, Draft } from "../shared/models.ts";
type Shortcut = [string, string, string?];
import { query, byId } from "./dom.ts";
import { asError } from "../shared/errors.ts";
import { escape, renderDiagrams } from "./shared.ts";
const pair = (
  name: string,
  definition: string,
  diagram: string,
): Shortcut[] => [
  [definition, "Projection/" + name + ".md", "Slide: Definition"],
  [diagram, "Projection/" + name + ".md", "Slide: Image"],
];
const web = () =>
  pair("Web foundations", "What is hypermedia?", "How links connect resources");
const defaults: Record<string, Shortcut[]> = {
  opening: web(),
  document: web(),
  forms: pair(
    "Progressive enhancement",
    "What is progressive enhancement?",
    "HTML → CSS → JavaScript layers",
  ),
  application: pair(
    "Browser applications",
    "Updating a page without reloading",
    "Browser ↔ server: partial updates",
  ),
  agents: pair(
    "Agentic directions",
    "Two possible agentic directions",
    "Provider-designed vs agent-composed UI",
  ),
  context: pair(
    "Context boundaries",
    "What is a context receipt?",
    "Which context reaches the agent?",
  ),
  synthesis: pair(
    "Shared capability",
    "One capability, multiple clients",
    "People, assistive tools, and agents",
  ),
};
const projectable = (s: { heading: string }) =>
  /^Slide: (Definition|Image|Quote)$/.test(s.heading);
export function mountExplorer({
  host,
  call,
  onShow,
  getScope,
}: {
  host: HTMLElement;
  call: ApiClient;
  onShow: (value: Partial<Draft>) => void | Promise<void>;
  getScope: () => string;
}) {
  const panel = document.createElement("section");
  panel.className = "explorer";
  panel.innerHTML =
    '<div class="section-heading"><h2>Explore this idea</h2><span id="explore-cue" class="small muted"></span></div><div id="explore-shortcuts" class="button-row"></div><form id="explore-search-form" class="search-row"><label class="search-field"><span class="sr-only">Search lecture notes</span><input id="explore-query" type="search" placeholder="Search an idea in the lecture notes…" minlength="2" maxlength="120" required></label><button>Search</button></form><p id="explore-status" class="small muted" role="status">Read privately. Show only when useful.</p><div id="explore-results"></div><section id="explore-selection" hidden><h3 id="explore-title"></h3><label>Note section<select id="explore-sections"></select></label><div id="explore-excerpt"></div><p id="explore-source" class="small muted"></p><button id="explore-show" class="primary">Show this excerpt →</button></section><details class="explore-prepare"><summary>Customize shortcuts for this cue</summary><p class="small">One per line: Label | relative note path | optional section. Use up to three cards with Slide: Definition, Slide: Image, or Slide: Quote sections. Saved in this browser only.</p><textarea id="explore-mappings" rows="4"></textarea><div class="button-row"><button id="explore-save">Save shortcuts</button><button id="explore-defaults">Restore defaults</button></div></details>';
  host.append(panel);
  const $ = byId;
  query(".section-heading", panel).append($("explore-show"));
  $("explore-show").disabled = true;
  const presenter = document.createElement("p");
  presenter.id = "explore-presenter";
  presenter.className = "small muted";
  $("explore-selection").prepend(presenter);
  let cue: { id: string; title: string } | undefined,
    notes: NoteFile[] = [],
    note: (Note & { credit?: string }) | undefined,
    section: Note["sections"][number] | undefined,
    request = 0,
    searchRequest = 0,
    custom: Record<string, Shortcut[]> = {};
  try {
    custom = JSON.parse(
      localStorage.getItem("lecture-projection-shortcuts") || "{}",
    );
  } catch {}
  if (!custom || typeof custom !== "object" || Array.isArray(custom))
    custom = {};
  const status = (text: string) => ($("explore-status").textContent = text);
  function mappings() {
    const value = custom[cue?.id ?? ""] || defaults[cue?.id ?? ""] || [];
    return Array.isArray(value) ? value.slice(0, 6) : [];
  }
  async function read(path: string, heading?: string) {
    const id = ++request;
    note = undefined;
    section = undefined;
    $("explore-selection").hidden = true;
    status("Reading lecture note…");
    $("explore-show").disabled = true;
    try {
      if (!notes.length) notes = (await call("library")).files;
      if (!notes.some((n) => n.path === path))
        throw new Error(
          "That note is not in the lecture folder. Search or update this shortcut.",
        );
      const result = await call(`note?path=${encodeURIComponent(path)}`);
      if (id !== request) return;
      const eligible = result.sections.filter(projectable);
      if (!eligible.length)
        throw new Error(
          "No projection-ready material in this note. Add a Slide: Definition, Slide: Image, or Slide: Quote section in Prepare.",
        );
      note = { ...result, sections: eligible };
      $("explore-title").textContent = note.title ?? "";
      presenter.textContent =
        "Presenter cue · " +
        (result.sections.find((s) => s.heading === "Presenter cue")?.body ||
          "");
      note.credit =
        result.sections.find((s) => s.heading === "Source")?.body || note.path;
      $("explore-sections").innerHTML = note.sections
        .map(
          (s, i) =>
            '<option value="' + i + '">' + escape(s.heading) + "</option>",
        )
        .join("");
      const preferred = note.sections.findIndex((s) => s.heading === heading);
      $("explore-sections").value = String(Math.max(0, preferred));
      select();
      $("explore-selection").hidden = false;
      status("Private excerpt · nothing projected or sent.");
    } catch (caught) {
      const e = asError(caught);
      if (id === request) status(e.message);
    } finally {
      if (id === request) $("explore-show").disabled = !section;
    }
  }
  function select() {
    if (!note) return;
    section = note.sections[Number($("explore-sections").value)];
    $("explore-excerpt").innerHTML = section.html ?? "";
    void renderDiagrams($("explore-excerpt"));
    $("explore-source").textContent = note.credit ?? "";
  }
  async function search(query: string) {
    const id = ++searchRequest;
    status("Searching lecture notes… First search builds a read-only index.");
    try {
      if (!notes.length) notes = (await call("library")).files;
      const data = await call(`search?q=${encodeURIComponent(query)}`);
      if (id !== searchRequest) return;
      $("explore-results").replaceChildren();
      const matches = data.matches.filter((match) =>
        projectable({ heading: match.section }),
      );
      for (const match of matches) {
        const button = document.createElement("button");
        button.className = "explore-result";
        const title = document.createElement("strong");
        title.textContent = match.title + " · " + match.section;
        const snippet = document.createElement("span");
        snippet.textContent = match.snippet;
        button.append(title, snippet);
        button.onclick = () => read(match.path ?? "", match.section);
        $("explore-results").append(button);
      }
      status(
        matches.length +
          " projection-ready sections" +
          (data.unavailable
            ? " · " + data.unavailable + " notes unavailable"
            : "") +
          ". Select one to read privately.",
      );
    } catch (caught) {
      const e = asError(caught);
      if (id === searchRequest) status(e.message);
    }
  }
  function draw() {
    $("explore-cue").textContent = cue?.title ?? "";
    $("explore-shortcuts").replaceChildren();
    for (const item of mappings()
      .filter(
        (item) =>
          Array.isArray(item) &&
          typeof item[1] === "string" &&
          !item[1].startsWith("?"),
      )
      .slice(0, 3)) {
      if (
        !Array.isArray(item) ||
        typeof item[0] !== "string" ||
        typeof item[1] !== "string"
      )
        continue;
      const [label, target, heading] = item;
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = () => {
        if (target.startsWith("?")) {
          $("explore-query").value = target.slice(1);
          void search(target.slice(1));
        } else void read(getScope() + "/" + target, heading);
      };
      $("explore-shortcuts").append(button);
    }
    $("explore-mappings").value = mappings()
      .map((m) => m.join(" | "))
      .join("\n");
  }
  $("explore-search-form").onsubmit = (e) => {
    e.preventDefault();
    void search($("explore-query").value);
  };
  $("explore-sections").onchange = select;
  $("explore-show").onclick = async () => {
    if (!note || !section) return;
    $("explore-show").disabled = true;
    try {
      await onShow({
        title: note.title,
        body: section.body,
        source: (note.credit ?? "").slice(0, 500),
      });
      status("Excerpt shown to the room. No coding prompt sent.");
    } catch (caught) {
      const e = asError(caught);
      status(e.message);
    } finally {
      $("explore-show").disabled = false;
    }
  };
  $("explore-save").onclick = () => {
    try {
      const rows = $("explore-mappings")
        .value.split("\n")
        .filter((l) => l.trim())
        .map((l) => l.split("|").map((s) => s.trim()));
      if (
        rows.length > 3 ||
        rows.some(
          (m) =>
            m.length < 2 ||
            m.length > 3 ||
            !m[0] ||
            !m[1] ||
            m[0].length > 60 ||
            m[1].length > 200 ||
            m[1].startsWith("/") ||
            m[1].includes("..") ||
            m[1].includes("\\"),
        )
      )
        throw new Error(
          "Use up to three labeled shortcuts inside the lecture folder.",
        );
      custom[cue!.id] = rows as Shortcut[];
      localStorage.setItem(
        "lecture-projection-shortcuts",
        JSON.stringify(custom),
      );
      draw();
      status("Shortcuts saved for this cue.");
    } catch (caught) {
      const e = asError(caught);
      status(e.message);
    }
  };
  $("explore-defaults").onclick = () => {
    delete custom[cue!.id];
    localStorage.setItem(
      "lecture-projection-shortcuts",
      JSON.stringify(custom),
    );
    draw();
  };
  return {
    setCue(next: { id: string; title: string }) {
      if (cue?.id === next.id) return;
      cue = next;
      request++;
      searchRequest++;
      note = undefined;
      section = undefined;
      $("explore-selection").hidden = true;
      $("explore-show").disabled = true;
      $("explore-results").replaceChildren();
      status(
        "Choose a definition or visual. Nothing is projected until you show it.",
      );
      draw();
    },
  };
}
