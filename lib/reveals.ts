import type MarkdownIt from "markdown-it";
import { parseFragment, serialize, type DefaultTreeAdapterMap } from "parse5";
import type { RevealDefinition } from "../shared/reveals.ts";

// A small Markdown block extension; authored HTML stays disabled.
export function installReveals(md: ReturnType<typeof MarkdownIt>) {
  md.block.ruler.before(
    "fence",
    "reveal",
    (state, start, end, silent) => {
      if (state.sCount[start]! - state.blkIndent >= 4) return false;
      const line = (n: number) =>
        state.src
          .slice(state.bMarks[n]! + state.tShift[n]!, state.eMarks[n])
          .trim();
      const opening = line(start);
      if (!/^:::\s*reveal\b/.test(opening)) return false;
      const match = /^::: reveal ([1-9]|1[0-9]|20)$/.exec(opening);
      if (!match) throw new Error("Use ::: reveal N with a step from 1 to 20");
      if (silent) return true;
      let closing = start + 1;
      let fence = "";
      for (; closing < end; closing++) {
        const text = line(closing);
        const code = /^(`{3,}|~{3,})/.exec(text)?.[1];
        if (fence) {
          if (
            code &&
            code[0] === fence[0] &&
            code.length >= fence.length &&
            text === code
          )
            fence = "";
          continue;
        }
        if (code) {
          fence = code;
          continue;
        }
        if (text === ":::") break;
        if (/^:::\s*reveal\b/.test(text))
          throw new Error("Reveal blocks cannot be nested");
      }
      if (closing === end)
        throw new Error("Close each reveal block with ::: on its own line");
      if (
        !state.src.slice(state.bMarks[start + 1], state.bMarks[closing]).trim()
      )
        throw new Error("Reveal blocks cannot be empty");
      const token = state.push("reveal_open", "div", 1);
      token.block = true;
      token.attrSet("data-reveal-step", match[1]!);
      const previousMax = state.lineMax;
      state.lineMax = closing;
      state.md.block.tokenize(state, start + 1, closing);
      state.lineMax = previousMax;
      state.push("reveal_close", "div", -1).block = true;
      state.line = closing + 1;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );
}

type Element = DefaultTreeAdapterMap["element"];
function elements(node: DefaultTreeAdapterMap["parentNode"]): Element[] {
  return node.childNodes.flatMap((child) =>
    "tagName" in child ? [child, ...elements(child)] : [],
  );
}
export function decorateReveals(html: string, definition?: RevealDefinition) {
  if (!html.includes("data-reveal-step=") && !definition?.rows?.length)
    return html;
  const document = parseFragment(html);
  const nodes = elements(document);
  const tables = nodes.filter((node) => node.tagName === "table");
  for (const emphasis of definition?.rows || []) {
    const table = tables[emphasis.table - 1];
    if (!table) throw new Error("Reveal emphasis references a missing table");
    const rows = elements(table).filter(
      (node) =>
        node.tagName === "tr" &&
        node.parentNode &&
        "tagName" in node.parentNode &&
        node.parentNode.tagName === "tbody",
    );
    for (const number of emphasis.rows) {
      const row = rows[number - 1];
      if (!row)
        throw new Error("Reveal emphasis references a missing table body row");
      let ancestor: DefaultTreeAdapterMap["parentNode"] | null = row;
      while (ancestor && "tagName" in ancestor) {
        const reveal = ancestor.attrs.find(
          (attr) => attr.name === "data-reveal-step",
        );
        if (reveal && Number(reveal.value) > emphasis.step)
          throw new Error("Reveal the table before emphasizing its rows");
        ancestor = ancestor.parentNode;
      }
      const attribute = row.attrs.find(
        (attr) => attr.name === "data-reveal-emphasis",
      );
      if (attribute) attribute.value += " " + emphasis.step;
      else
        row.attrs.push({
          name: "data-reveal-emphasis",
          value: String(emphasis.step),
        });
    }
  }
  const result = serialize(document);
  const steps = new Set(
    [...result.matchAll(/data-reveal-(?:step|emphasis)="([\d ]+)"/g)].flatMap(
      (match) => match[1]!.split(" ").map(Number),
    ),
  );
  const total = Math.max(0, ...steps);
  if (steps.size !== total)
    throw new Error("Reveal steps must be consecutive, starting at 1");
  return result;
}
export function revealTotal(html: string) {
  return Math.max(
    0,
    ...[...html.matchAll(/data-reveal-(?:step|emphasis)="([\d ]+)"/g)].flatMap(
      (match) => match[1]!.split(" ").map(Number),
    ),
  );
}
