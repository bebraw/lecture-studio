# Author the lecture in Obsidian

Obsidian owns the sequence, wording, speaker notes, references, activities and
build instructions. Studio loads a validated snapshot; it does not write back to
your vault. Author prose in Markdown and settings in small YAML blocks. Existing
JSON blocks and whole-deck JSON definitions remain supported.

For public self-study versions, slides can declare `study.explanation`, `study.prompt`,
`study.answer`, `study.correctOption` (a poll option ID), and `study.exclude`.
These public settings are separate from private speaker notes. See the
[self-study export and publishing guide](self-study-handover.md).

For interactive HTML demos, put a self-contained file beside the note and add
`demo: ./example.html` to a material slide. The [demo authoring guide](interactive-demos.md)
describes the small synchronization API and includes a complete starter example.

## Edit and present

1. With Live off, open the presentation menu and choose **Download editable Markdown**.
   Replace the presentation note's content in Obsidian with this file, keeping a
   vault backup. The download uses YAML settings and preserves slide IDs and content.
2. Choose **Edit in Obsidian**, edit and save the note, then **Reload from Obsidian**
   with Live off. Reload validates before replacing the snapshot and restarts the
   lecture session. Finish active builds and close polls before reloading.
3. Browse the outline privately, then turn Live on to present. Edits never change
   the projection until you explicitly reload.

The versioned [full lecture](presentations/web-development-2026.md) uses this
format. Keep your note under the configured Obsidian lecture folder so Studio
can find it. Slide order follows the note; stable IDs connect activities.

## Minimal lecture

````markdown
# My lecture

## Presentation

```yaml
version: 1
title: My lecture
```

## Slide: A concrete example

```yaml
id: example
type: material
chapter: Present
```

Write your **own explanation** here, using ordinary Markdown.

<!-- speaker-notes -->

Private speaking notes: tell the story behind this example.

## Slide: Takeaway

```yaml
id: takeaway
```

One clear point to remember.
````

Each slide starts with `## Slide: Title` followed by a fenced `yaml` block
(`yml` and `json` also work). Use backtick fences of three or more characters.
Write `title`, `body` and `notes` as Markdown, outside the metadata block.
The exact `<!-- speaker-notes -->` marker must be on its own line; everything
following it until the next slide is private notes. Use level-three (`###`) or
deeper headings inside slide content. Markdown supports lists, links, tables,
code fences and Mermaid diagrams. Raw HTML and Obsidian-only embeds are not a
substitute for supported Markdown.

YAML uses spaces for indentation, `true`/`false` for booleans and `-` for list
items. Quote colors (`"#ffffff"`), numeric-looking string IDs, and text containing
`: ` or ` #`. For long instructions use `|` with indented lines. Duplicate keys,
YAML aliases, unknown tags and unknown slide metadata fields are rejected.
Downloads normalize settings and do not preserve YAML comments or formatting;
your Obsidian note remains the source of truth.

## Presentation settings

| Field     | Type             | Meaning                                                      |
| --------- | ---------------- | ------------------------------------------------------------ |
| `version` | number, required | Must be `1`.                                                 |
| `title`   | string, required | Lecture title, up to 200 characters.                         |
| `start`   | slide ID         | Opening slide; defaults to the first slide.                  |
| `theme`   | mapping          | Optional lecture-wide colors and local font families, below. |

```yaml
version: 1
title: My lecture
theme:
  background: "#ffffff"
  text: "#202020"
  muted: "#616161"
  accent: "#e6e6e6"
  headingFont: Georgia, serif
  bodyFont: Arial, sans-serif
  codeFont: Menlo, monospace
```

These are the defaults. Colors must have six hex digits. Font values are local
CSS family lists, up to 150 characters; Studio does not download fonts. Theme
settings apply to the whole presentation, with no per-slide overrides.

## Slide types

| `type`     | Behavior                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------- |
| `title`    | Title or chapter divider.                                                                    |
| `question` | Discussion prompt. Add `wordCloud: true` to collect short responses.                         |
| `material` | Ordinary content; the default when `type` is omitted.                                        |
| `poll`     | Multiple-choice activity with required `poll` and `room` settings.                           |
| `build`    | Markdown body is a private implementation brief, submitted only on an explicit build action. |

Word clouds, previews and teaching demos are flags/settings on these types,
not additional type names. Selecting a slide never starts generation.

## All slide settings

| Field               | Type                         | Meaning                                                                                                                |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                | string, required             | Unique stable ID: 1–60 lowercase letters, digits or hyphens.                                                           |
| `type`              | string                       | One of the five types above; defaults to `material`.                                                                   |
| `chapter`           | string                       | Outline/reading-copy grouping, up to 100 characters.                                                                   |
| `source`            | string                       | Reference/attribution text or URL, up to 500 characters.                                                               |
| `next`              | slide ID                     | Next target for narrative navigation; defaults to the following slide. Omit on the final slide.                        |
| `related`           | list of slide IDs            | Linked detours; Return resumes the narrative.                                                                          |
| `poll`              | mapping                      | Required on polls: `question`, `options`, `defaultId`.                                                                 |
| `room`              | string                       | Required on polls: prepared audience room ID, 1–80 lowercase letters, digits or hyphens.                               |
| `uses`              | list of mappings             | Build dependencies: each has `poll` (slide ID) and `instructions` (option-ID-to-text mapping). Up to ten dependencies. |
| `previewOf`         | build slide ID               | Preview checkpoint associated with a build. Presenter chooses prepared or generated output explicitly.                 |
| `teachingDemo`      | boolean                      | Enable the built-in failure teaching demo.                                                                             |
| `layersDemo`        | boolean                      | Enable the built-in HTML/CSS/JavaScript layers demo.                                                                   |
| `wordCloud`         | boolean                      | Offer a moderated short-response collection for this slide.                                                            |
| `wordsFrom`         | word-cloud slide ID          | Include up to 20 distinct approved responses in the resolved build brief.                                              |
| `wordsInstruction`  | string                       | Authored instruction for interpreting `wordsFrom`; audience responses remain data.                                     |
| `reviewWordsFrom`   | list of word-cloud slide IDs | Show approved response summaries from up to four collections.                                                          |
| `allowRemoteImages` | boolean                      | Opt in to supported remote images for this slide; default false. Use HTTPS images with attribution.                    |

Boolean flags default to false. References must resolve to existing slides of
the required type. Titles are limited to 200 characters, bodies to 16,000 and
private notes to 4,000. A deck has 1–100 slides. The static resolved-prompt budget
is 12,000 characters (body plus words instruction plus the longest instruction
and 500 characters of allowance per poll dependency), checked on every slide.
Each poll-option instruction is at most 2,000 characters.

`next`/`related` support narrative navigation; the outline still lists slides in
note order. When reordering slides exported from Studio, update explicit `next`
links too, or remove them to use the new document order.

## Poll and dependent build

The note is the source of truth for question wording, option IDs, labels and the
default. Explicitly loading/reloading the presentation prepares its rooms in the
audience service while Live is off; new polls need no service deployment. The
readiness indicator confirms the prepared poll count. Changed definitions are
rejected if a room is open or contains votes. Use a new room ID for a revised
question to preserve earlier votes. The bundled legacy rooms remain available.

````markdown
## Slide: Choose a theme

```yaml
id: theme-vote
type: poll
room: webdev-2026
poll:
  question: Which visual theme should shape our app?
  options:
    - id: editorial
      label: Editorial
    - id: retro-web
      label: Retro web
    - id: playful
      label: Playful
  defaultId: editorial
```

Choose the direction we will use in the demonstration.

## Slide: Apply the choice

```yaml
id: build-document
type: build
uses:
  - poll: theme-vote
    instructions:
      editorial: Use restrained typography and a clear hierarchy.
      retro-web: Use a readable retro theme with accessible contrast.
      playful: Use a playful theme while preserving readable typography.
```

Update only the prepared page's styling. Preserve its content and controls.

## Slide: Inspect the result

```yaml
id: inspect-document
previewOf: build-document
```

Compare the result with the audience's choice.
````

Polls require a nonempty question (up to 200 characters), 2–6 options, unique
option IDs (1–50 lowercase letters, digits or hyphens), nonempty labels (up to
80 characters), and a `defaultId` matching an option. Provide an instruction for
every option in each `uses` dependency. Close the vote to freeze its result, or
explicitly accept declared defaults before building. A build receipt keeps the
inputs used for that attempt; later votes do not rewrite it.

The bundled prepared previews correspond to `build-document`, `build-forms`,
`build-application` and `build-agents`. An arbitrary build ID can be referenced,
but does not create a new bundled fallback automatically.

## Word clouds and review

````markdown
## Slide: What is difficult?

```yaml
id: friction-words
type: question
wordCloud: true
```

Describe one difficulty in a few words.

## Slide: Respond to those needs

```yaml
id: build-needs
type: build
wordsFrom: friction-words
wordsInstruction: |
  Map these needs to headings and content order.
  Use only supported facts; identify missing information.
```

Improve the prepared page's information structure.

## Slide: Revisit the discussion

```yaml
id: review
reviewWordsFrom:
  - friction-words
```

Which needs did the demonstration address?
````

Only approved responses enter briefs and review summaries. Without approved
words, the build uses the prepared information structure and must not invent
audience findings. Continuous freeform questions use the separate moderated
question queue; they require no slide type or YAML flag.

## Build model and controls

New builds default to **Luna (`gpt-5.6-luna`) with low reasoning effort**. Choose
another locally available Codex model in Prepare when a task needs it. If Luna
is missing from the local model list, Studio reports an error; update Codex or
select an available model explicitly. It does not silently switch to a more
expensive model. This setting does not change your global Codex configuration.

Start a demo early, continue presenting while it runs, and return to its result.
Stop or retry through the demo controls when needed. One Codex turn runs at a
time in the shared rehearsal workspace; parallel builds are not supported.
Prepared previews keep the lecture moving. Private build timing history helps
compare models and rehearse, but is not a model-quality or latency guarantee.

## Reading copies and publishing

**Preview reading copy** opens `/slides`, generated from the loaded snapshot.
Speaker notes, build instructions and live responses are excluded. Print that
page to save a PDF. It updates after an explicit reload from Obsidian. The editable
Markdown download includes private notes and build briefs; it is for authoring,
not distribution to the audience.

Print uses an A4 reading layout with chapter breaks, grouped slide content,
wrapped code, readable tables and diagrams. Enable browser headers/footers for
page numbers. The print browser test also renders the full deck for visual review.

For the deployed audience copy, save the authored Markdown as the versioned
export and run the normal build/deployment workflow. The build can also read a
chosen export with `node --import tsx scripts/build-handout.ts /path/to/lecture.md`.
The deployed copy remains static until deployment; do not independently edit it.

## Local figures and demo reading copies

Place SVG, PNG, JPEG, GIF or WebP images beside the presentation note (subdirectories are supported):

```markdown
![Course progression](./course-progression.svg)
```

For a demo slide, declare a static visual for reading copies:

```yaml
id: progression
type: material
demo: ./course-progression.html
demoPoster: ./course-progression.svg
```

Keep explanatory Markdown below the metadata. `demoPoster` appears alongside that text in `/slides`, printed reading copies, and the self-study export. It is an authored image, not an automatic screenshot. In self-study it stays visible until the demo has initialized, then hides on screen; no-JavaScript reading, print, and demo failures retain it. Interactive demos continue to use their HTML and synchronized state.

References must start with `./` and stay within the presentation directory; parent traversal and external image references are not local assets. Images are limited to 2 MB each and 16 MB per deck. Export rejects symlinks that escape the presentation directory. SVGs render as images, never inline HTML, so their scripts cannot run. Image data is embedded in rendered output for portable exports; original Markdown references remain unchanged.

The public audience service has a 100 KB stage limit. If embedded images exceed the publication budget, students see a pointer to the projector or reading copy; the local projector and exported copy retain the figures. HTML demos use a separate bounded publication field, so this image fallback does not limit demo mirroring.

## Public audience mirroring

With the updated audience service deployed, HTML demos automatically mirror to student devices while Live is on. No extra YAML or demo API is needed. The lecturer remains the only controller; students receive `LectureDemo.role === "viewer"` and follow the published state, including reset and late joining. Hide controls for viewer roles and derive all visuals from shared state. Audience refreshes normally arrive every 1.5 seconds, after Studio publishes the state.

Only the currently projected live demo is uploaded. Loading a presentation or editing with Live off does not publish its demos. Studio sends the HTML when entering a demo, then sends state-only updates; the audience iframe remains mounted. Navigating away, blanking the stage, or turning Live off removes the stored public demo and makes its URL return 404. Resuming republishes the current snapshot. Already downloaded content cannot be recalled from a student's device.

The public HTML runs in an opaque-origin sandbox, with scripts allowed but network access, forms, popups, storage and parent-page access blocked. Direct navigation is sandboxed by the response CSP too; a `role=controller` query cannot enable controls. The same 250 KB HTML and 16 KB JSON state limits apply. HTML is served separately from the audience polling response, with `Cache-Control: no-store`. Demo files are public teaching material while live: keep private information out of HTML and shared state.

Deployment: update the audience Worker and restart Studio together. The `web-demo-mirroring` capability check detects an older service. No new bindings, secrets or Durable Object migrations are required. Self-study exports still give each learner independent controls.

## Presenter identity

The presentation metadata supports `identity` with `presenter`, `affiliation`,
`contactEmail`, local `logo`, `joinUrl`, optional local `qrCode`, and `hideOn`.
Use `hideIdentity: true` on a slide to give its content the full space. See the
[identity example and asset limits](../PRESENTATIONS.md#reusable-presentation-identity).

## Progressive reveals

Use ordered containers to introduce points, annotations or process stages on a
static title, material or question slide:

```markdown
This context is always visible.

::: reveal 1

- Introduce the first point.
  :::

::: reveal 1
A second block appears at the same time.
:::

::: reveal 2
Explain the next stage.
:::
```

Steps start at 1 and must be consecutive (up to 20). Each container can hold
multiple Markdown blocks. Containers cannot nest. Unrevealed blocks reserve their
layout space and cannot receive keyboard focus. Reveals have no animation.

For comparisons, keep the whole table visible and emphasize selected body rows
at each step. Add this to the slide's YAML metadata:

```yaml
reveals:
  rows:
    - step: 1
      table: 1
      rows: [1, 2]
    - step: 2
      table: 1
      rows: [3]
```

Tables and body rows are numbered from 1; headers do not count. Multiple rows
can share a step, including a step used by content containers. Emphasis moves to
the current step's rows while surrounding rows remain readable. A table inside a
reveal container must be visible by the time its rows are emphasized.

**Next** reveals each step before advancing. **Previous** hides the current step;
going back from step 0 opens the previous slide fully revealed. Selecting a slide
in the outline starts it at step 0. The desk shows the current step and provides
**Preview all reveal content · private**. The projector and audience devices,
including late joiners, receive the same step. Reveals control presentation pacing;
the complete slide content is included in the page.

Print/PDF and reading exports show everything. Self-study exports have local
Previous reveal/Next reveal controls and save each reader's step on their device;
reading mode expands all content. Slides without reveals behave as before.

Use separate slides for reveals and live polls, builds, embedded demos or generated
review content. See [the complete example](../examples/progressive-reveals.md).

## Conference PDF exports

See [conference PDF exports](conference-pdf.md) for `pdf` presentation metadata,
captioned `demoSequence` states or images, and per-slide `publication` overrides.
These settings round-trip with the editable Obsidian source. Public explanations
belong in `publication.explanation`, separate from private speaker notes.
