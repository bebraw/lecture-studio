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
