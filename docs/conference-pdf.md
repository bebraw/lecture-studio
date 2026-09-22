# Conference slide PDFs

Export a local Obsidian Markdown presentation directly, without starting Studio:

```sh
npm ci
npx playwright install chromium
npm run export:pdf -- /path/to/vault/Presentations/talk.md output/talk.pdf
npm run export:pdf -- /path/to/vault/Presentations/talk.md output/talk-4-3.pdf --aspect 4:3
```

The output is a fixed slide canvas, using the projector typography and layout.
It opens offline in Acrobat Reader and other PDF readers. Text remains selectable;
Markdown tables, code and Mermaid diagrams retain text/vector rendering. The
existing `/slides` reading copy and its A4 print layout are unchanged.

The default aspect ratio is 16:9. Set `pdf.aspectRatio: '4:3'` in the Presentation
metadata, or override it with `--aspect`. Output filenames are explicit; an
existing PDF is replaced only after a complete successful export.

Local images, logos and QR assets are embedded. Remote images must be downloaded
and referenced with `./` paths. Assets must stay within the presentation folder,
including symlinks. Missing or undecodable images, failed diagrams, and content
outside the slide canvas stop the export with an error. Shorten or split an
overflowing slide; the exporter does not silently shrink text.

Chromium embeds the fonts it uses. For repeatable typography across export
machines, bundle licensed font files next to the presentation:

```yaml
pdf:
  aspectRatio: "16:9"
  fonts:
    - family: Conference Sans
      source: ./fonts/conference-regular.woff2
    - family: Conference Sans
      source: ./fonts/conference-bold.woff2
      weight: bold
theme:
  bodyFont: Conference Sans, sans-serif
```

Only explicitly public slide fields enter the renderer. Speaker notes, build
instructions, runtime responses and credentials are never serialized into it.
Live demos require an authored static visual for export.

## Reveal pages

Each reveal state becomes a consecutive PDF page with the same reserved layout.
Static initial content produces a `Reveal 0` page; a body consisting entirely of
reveal blocks starts with step 1. Blocks sharing a step appear together. Table-row
emphasis follows the current step. The footer distinguishes logical slide numbers
from reveal numbers, for example `Slide 4 / 12 · Reveal 2 / 3`.

Advance or reverse in any PDF reader to follow the authored sequence. The export
uses the same flat slide order as the desk's Next button, including detour slides.

## Authored demo sequences

Add `demoSequence` to a slide. Each frame needs a public caption and exactly one
of `state` (a JSON object string for the slide's `demo`) or `image` (a local asset):

```yaml
demo: ./order.html
demoSequence:
  - state: '{"status":"available"}'
    caption: The available action uses the version read by the client.
  - state: '{"status":"cancelled"}'
    caption: Successful cancellation moves the order to version 8.
  - image: ./stale-request.svg
    caption: A stale version 7 request is rejected without changing the order.
```

Frames appear in authored order and retain the same logical slide number. Static
image sequences also work without an HTML demo. A `demoPoster` remains the
single-frame fallback. Use separate slides for block reveals and demo sequences.

HTML frames use the live demo's `LectureDemo.onState` callback in an isolated,
network-disabled 1200 × 600 viewport. Return a promise for asynchronous rendering:
the exporter waits for it, then fonts and images, before taking a 2× PNG snapshot.
The exported PDF runs no demo code. State frames are raster visuals; slide text,
SVG image alternatives and captions retain vector/text rendering.

Each frame starts fresh with a fixed clock and seeded `Math.random`. Author the
complete visible state; do not depend on earlier clicks, network calls, timers,
random identifiers or uncontrolled animation. Unresolved render callbacks fail
after 10 seconds. Missing images, rendering errors and overflowing demos identify
the slide and frame; they never silently skip a state.

See [the cancellation example](../examples/conference/talk.md), covering the
available action, success, a stale request and recovery, with the same HTML demo
usable live in Studio.

## Presentation and publication copies

`--mode presentation` (the default) preserves reveal and demo-frame pages.
`--mode publication` collapses each reveal slide to its complete content while
retaining every authored demo frame and caption. Source credits and references
remain visible. Slide numbers count the logical slides included in that output.

Author public changes in the slide metadata, separately from speaker notes:

```yaml
publication:
  title: A title for independent reading
  body: |
    This replaces temporary participation instructions with public content.
  explanation: |
    This additional explanation is intended for readers without the speaker.
```

`body` is an optional complete replacement; `explanation` appends public prose.
Use `publication: { omit: true }` to omit a session-only slide, or
`publication: { hideIdentity: true }` to hide its identity footer. Explanations
must fit the fixed canvas too; use another authored slide for longer discussion.
Private `<!-- speaker-notes -->` content is never used as an explanation.

Publication mode removes the live join URL and QR by default, preserving presenter,
affiliation, logo and public contact details. To replace them with permanent
resources, add this to the Presentation metadata:

```yaml
pdf:
  publicationIdentity:
    joinUrl: https://example.org/paper
    qrCode: ./paper-qr.svg
```

For the AI Day filenames in the requirements:

```sh
npm run export:pdf -- /path/to/talk.md output/Vepsalainen_Juho_AI_Day_2026.pdf --mode presentation
npm run export:pdf -- /path/to/talk.md output/Publish_Vepsalainen_Juho_AI_Day_2026.pdf --mode publication
```

The source remains editable in Obsidian; PDFs are generated snapshots. Export does
not connect to Studio, Obsidian's API, audience services or a venue account. Build
instructions, speaker notes, credentials, audience responses and attendee emails
are not read from runtime state or serialized into either PDF.

Before submitting, open both PDFs in the venue's reader and inspect page navigation,
fonts, source credits and every example frame. The export preflight checks element
bounds and asset readiness; it cannot judge whether an explanation is sufficient.
The repository example produces 11 presentation pages and 8 publication pages.
[Hosted Q&A](independent-qa.md) runs independently of the venue PDF; PowerPoint export is not planned.

## Event variants and timing budgets

Keep shared material in one note. Presentation metadata can select and order slides
for each event, without copying their content:

```yaml
variants:
  ai-day:
    title: AI Day 2026
    slides: [opening, comparison, order, references]
    speakingMinutes: 12
    qaMinutes: 3
    durations: { opening: 60, comparison: 180, order: 420, references: 60 }
  webist:
    title: WEBIST 2026
    slides: [opening, comparison, order, process, references]
    speakingMinutes: 15
    qaMinutes: 5
    durations:
      { opening: 60, comparison: 180, order: 420, process: 180, references: 60 }
```

Set `durationSeconds` in slide metadata for a shared estimate. A variant's
`durations` override those estimates, allowing more explanation at a longer event.
Each estimate covers the entire logical slide, including its reveals/demo frames.
Budgets are planned timings, not a running stopwatch. Missing estimates are listed
as untimed; over-budget speaking plans are reported without consuming the Q&A
allocation or silently blocking export.

```sh
npm run export:pdf -- talk.md Vepsalainen_Juho_AI_Day_2026.pdf --variant ai-day
npm run export:pdf -- talk.md Publish_Vepsalainen_Juho_AI_Day_2026.pdf --variant ai-day --mode publication
npm run export:pdf -- talk.md WEBIST_2026.pdf --variant webist
```

Timing reports describe the selected delivery plan, even when publication mode
omits a session-only slide. Publication overrides apply after variant selection.
Without `--variant`, all authored slides are exported.

In Studio, load the source, reopen the presentation picker, choose **Event variant**,
and click **Load variant** with Live off. Reload and restart preserve the selected
variant. **All authored slides** returns to the full note. Editable Markdown export
always retains the entire source and all variant definitions.

Variant slide IDs must be unique and present in the source. Next/Previous follow
the selected order, starting at its first slide. Links to omitted detours are removed.
Poll inputs, demo previews and word-review dependencies must remain in the variant
before the slide that uses them. Invalid variants fail preparation with a named
slide/dependency instead of leaving broken navigation.

Variants can override `identity` for event-specific Q&A links and QR assets:

```yaml
variants:
  ai-day:
    title: AI Day 2026
    slides: [opening, comparison, order, references]
    speakingMinutes: 12
    qaMinutes: 3
    identity:
      joinUrl: https://live.scalableweb.dev/q/ai-day-2026
      qrCode: ./ai-day-questions.svg
```

Unspecified identity fields retain the shared presenter/affiliation/logo. Use a
matching QR asset when changing the URL. Publication mode removes the resulting
session link/QR as usual. [Provision the Q&A session](independent-qa.md) before
exporting the PDF; the example's `example.org` addresses are placeholders.

## Static poll activities

PDF exports include `poll.question` and all option labels in authored order,
alongside the slide title and Markdown body. A question identical to the title
is shown only once. Choices are plain text: `defaultId` does not indicate an
answer or selection, and runtime votes/results are never included. Poll text
uses the same slide-boundary checks as other content.

Publication copies retain the activity by default. `publication.explanation`
adds context; an explicit `publication.body` replaces the activity (including
its metadata question and choices), and `publication.omit` removes the slide.

## Top-right institutional logo

Use shared identity metadata to place a logo in the slide header:

```yaml
identity:
  logo: ./assets/aalto-logo.svg
  logoPosition: top-right
```

The default is `footer`. `top-right` reserves a header area on the live stage,
its presenter previews, and both PDF modes, preserving the image proportions.
Omit `presenter`, `affiliation`, and `contactEmail` for logo-only branding with
no identity footer. Put contact details in ordinary Questions slide content.
Source credits and slide numbers remain in their independent bottom row.

Event variants can override `identity.logoPosition`. Existing `hideIdentity`,
`identity.hideOn`, and publication visibility/identity overrides still apply.
Publication removes live join links and QR codes while retaining the logo and
placement. Reading, self-study, and audience pages keep their identity block
layout. Dense slide content must fit the reduced space below the header;
PDF export reports overflow rather than allowing overlap.

To make a top-right logo twice its current visible size:

```yaml
identity:
  logo: ./assets/aalto-logo.svg
  logoPosition: top-right
  logoScale: 2
```

`logoScale` accepts numbers from `0.5` to `3` (default `1`). It scales both
visible dimensions proportionally and reserves the corresponding header space
on the stage, previews and both PDF modes. It applies only to top-right slide
logos; footer and reading-page branding keep their existing sizes. Event
`identity` overrides and `pdf.publicationIdentity` can set it independently.
Larger logos leave less space for slide content; PDF overflow errors identify
slides that need shorter content or a smaller logo.

## Optional header and footer rules

Hide the decorative lines independently in presentation metadata:

```yaml
theme:
  headerRule: false
  footerRule: false
identity:
  logo: ./assets/aalto-logo.svg
  logoPosition: top-right
  logoScale: 2
```

Both rules default to enabled. These boolean settings apply to the live stage,
presenter previews, and presentation/publication PDFs. Hiding a rule preserves
its layout space, including logo clearance, chapter labels, source credits and
slide/reveal/example numbering. Tables, code, diagrams, demo content and Studio
UI separators keep their own styling. Loading a deck without these options
restores the rules.
