# Obsidian presentation snapshots — first migration

The full lecture is migrated as **Web development 2026**: 25 preferred-path steps, 12 optional detours, three polls and four build prompts. In Prepare, choose **Find presentations in Obsidian**, select that note, then **Load snapshot / restart presentation**. Its chapter-grouped outline is generated from the loaded definition; selecting an outline step stays private. In Present, use Begin presentation, Next, Previous, named detours and Return to narrative.

Two example definitions live under **Lectures/Web Development 2026/Presentations**: Web opening and Discussion practice. The current scoped Obsidian connection is intentionally unchanged; presentations currently need to be inside that lecture folder. Use original lecture to return to the old implementation.

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
