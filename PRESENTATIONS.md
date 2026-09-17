# Presentation notes

For current authoring, supported types and all settings, use the
[Markdown + YAML authoring guide](docs/obsidian-authoring.md). The versioned full
lecture contains 89 slides. The notes below describe earlier migrations and
subsequent implementation passes; their historical counts and UI descriptions
are not the current authoring reference.

## Obsidian presentation snapshots — first migration

The full lecture is migrated as **Web development 2026**: 78 slides: 51 main lecture steps, eight reference slides (including the divider), and 19 optional detours. The lecture includes three polls and four build prompts. In Prepare, choose **Find presentations in Obsidian**, select that note, then **Load snapshot / restart presentation**. Its chapter-grouped outline is generated from the loaded definition; selecting an outline step stays private. In Present, use Begin presentation, Next, Previous, named detours and Return to narrative.

Two example definitions live under **Lectures/Web Development 2026/Presentations**: Web opening and Discussion practice. The Obsidian connection searches within **Lectures**, including its subfolders. Keep presentation notes in **Lectures/<course>/Presentations/**; the presentation menu lists only notes inside a **Presentations** directory. Use **Refresh list** after adding or moving a presentation. Use original lecture to return to the old implementation.

Each note has a **Presentation** heading containing one fenced JSON block:

- version: 1, title, start (step ID), steps.
- Each step: stable id, type (title, question, material, poll, build), title, body, private notes, optional source.
- next is the preferred path; related is a list of named detour step IDs.
- Poll steps declare room and poll (question, options with id/label, defaultId). The room must already exist; the studio does not provision or reset it.
- Build steps use body as their template and uses as dependencies: each dependency names a poll step and supplies instructions keyed by each valid option ID.

Loading validates and snapshots the entire definition, privately. Note edits take effect only when explicitly loaded again. The prototype snapshot, navigation history, decisions and build receipts live in server memory, not in the note; restarting the server loses that session. Switching presentations starts fresh and is blocked during running builds or open polls. Previous sessions are not yet archived.

Missing decisions block a build until the vote is closed or **Use declared defaults** is explicitly clicked. Build launch projects and submits the resolved prompt and captures its decision inputs. Later decisions do not rewrite that receipt. Starting the same build step twice in one session is blocked.

The stage's existing subtle progress footer remains independent of navigation. Existing detected-app preview controls remain available; dedicated app-inspection graph steps are not implemented in this first migration. Richer content is Markdown/Mermaid under the existing renderer; local image embeds are not added here.

The original hard-coded lecture remains only as an explicit legacy fallback. The old narrow sidebar has been replaced by the loaded presentation outline. Edit the full lecture in Obsidian, not the legacy JavaScript arrays. The opening and discussion examples remain available for short tests.

# Presentation themes

The top-level presentation JSON may include a `theme` object. Omitted fields use these defaults:

```json
{
  "theme": {
    "background": "#ffffff",
    "text": "#202020",
    "muted": "#616161",
    "accent": "#e6e6e6",
    "headingFont": "Georgia, serif",
    "bodyFont": "Arial, sans-serif",
    "codeFont": "Menlo, monospace"
  }
}
```

Colors use six-digit hex notation. Fonts are locally available CSS family lists; no remote fonts are downloaded. The snapshot carries its theme to the private preview, projected slides, and Mermaid diagrams. Studio controls remain independent. There are no per-slide overrides. Existing notes need no migration; reload the snapshot after changing a theme in Obsidian.

# September 2026 presentation pass

The opening contents slide previews Past, Present, Future and References. Each has a title divider. CERN and Engelbart use credited historical photographs; these remote images require network access. Progressive enhancement uses a layered teaching diagram.

Native form submission, AJAX with HTML, and AJAX with JSON each use four successive slides. Use Next/Previous to walk through them. The final native-form slide focuses on loading the results after the redirect.

The stage and private preview show `current/total` and a subtle bottom progress bar. Numbering includes reference slides and detours. Progress follows the main lecture, reaches completion before References, and holds its place during linked detours. Reload the Obsidian snapshot to pick up note edits; restart the app after server changes.

The reviewed lecture export is versioned in [docs/presentations/web-development-2026.md](docs/presentations/web-development-2026.md). Obsidian remains the live source. Full attributions stay in speaker notes and the References section; footers use short credits.

Staged Mermaid sequence diagrams can include `%% focus-after: M,N`, where `M` is the number of previously explained messages and `N` the number of previously explained notes. Those elements are muted; later elements remain emphasized. This is optional and does not affect other diagrams. The stage shows build status only while working or waiting for input. Standalone historical images expand to the slide area without cropping.
