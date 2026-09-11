import type { Library, Note } from "../shared/models.ts";
type Index = { notes: Note[]; unavailable: number };
export class LectureSearch {
  library: Pick<Library, "list" | "read">;
  pending: Promise<Index> | null;
  index: Index | null;
  constructor(library: Pick<Library, "list" | "read">) {
    this.library = library;
    this.pending = null;
    this.index = null;
  }
  clear() {
    this.index = null;
  }
  async build() {
    if (this.index) return this.index;
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const files = await this.library.list(),
        notes: Note[] = [];
      let cursor = 0,
        unavailable = 0;
      await Promise.all(
        Array.from({ length: Math.min(4, files.length) }, async () => {
          while (cursor < files.length) {
            const file = files[cursor++];
            if (!file) break;
            try {
              const note = await this.library.read(file.path);
              notes.push(note);
            } catch {
              unavailable++;
            }
          }
        }),
      );
      if (files.length && !notes.length)
        throw new Error(
          "No lecture notes could be read. Check Obsidian and try again.",
        );
      this.index = { notes, unavailable };
      return this.index;
    })();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }
  async search(query: unknown) {
    if (
      typeof query !== "string" ||
      query.trim().length < 2 ||
      query.length > 120
    )
      throw new Error("Search needs 2–120 characters");
    const terms = query.toLowerCase().trim().split(/\s+/),
      { notes, unavailable } = await this.build();
    const matches = [];
    for (const note of notes) {
      for (const section of note.sections) {
        const text = note.title + " " + section.heading + " " + section.body;
        if (!terms.every((term) => text.toLowerCase().includes(term))) continue;
        const offset = Math.max(
          0,
          section.body.toLowerCase().indexOf(terms[0] ?? "") - 60,
        );
        matches.push({
          path: note.path,
          title: note.title,
          section: section.heading,
          snippet: section.body.slice(offset, offset + 220),
          score: terms.filter((t) =>
            (note.title ?? "").toLowerCase().includes(t),
          ).length,
        });
      }
    }
    return {
      matches: matches
        .sort(
          (a, b) =>
            b.score - a.score || (a.title ?? "").localeCompare(b.title ?? ""),
        )
        .slice(0, 20),
      unavailable,
    };
  }
}
