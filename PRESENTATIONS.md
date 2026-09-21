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
- Poll steps declare room and poll (question, options with id/label, defaultId). Loading the snapshot prepares the room through the authenticated audience service; no per-poll deployment is needed.
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

### Private question follow-ups

Attendees can leave **Email for a reply** blank to stay anonymous. Reply emails
are visible only in the private Responses desk; selecting **Discuss** projects
only the question text. Emails are not included in AI context or public exports.
Mark questions **Answered live**, **Reply later**, or **Dismissed**. Select the
follow-ups to include and use **Export selected follow-ups (.md)** to download a
private Obsidian-compatible file. Keep that file outside published materials.
Export works after Live ends, until the queue expires 24 hours after it opened
(the desk shows the deadline). Starting a new lecture clears the queue. Sending
replies is a separate action in your email application.

Open **Responses → Q&A desk** for a focused private moderation view. Questions
are grouped as pending, shortlisted, follow-ups and completed. Shortlisting never
publishes a question. Use ↑/↓ to select, S to shortlist, D to discuss, A to mark
answered live, F for follow-up, and R to return to the previous slide or demo.
Escape exits the desk. Shortcuts are inactive while editing form fields. The open/closed
indicator shows whether questions are still accepted; microphone questions can be
handled alongside the queue without closing submissions. Returning restores the
previous synchronized demo state.

### Prepare polls from Obsidian

Each poll slide declares `room` plus `poll.question`, `poll.options` (unique IDs
and labels), and `poll.defaultId`. Use a room ID specific to the talk, such as
`conference-prediction`. Loading/reloading the presentation explicitly creates or
updates those rooms while Live is off. The readiness message confirms the service
and prepared poll count. No file watching changes a running poll.

Conflicting definitions for one room in a deck are rejected. Any change to wording,
option order, IDs, labels, or default is rejected if the room has votes or is open.
Use a new room ID for a revised question to preserve the original votes. An
identical preparation is safe to repeat. A new lecture's first opening still
starts a fresh voting round; reopening within that lecture preserves its votes.
