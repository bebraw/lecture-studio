# Self-study integration handover

Lecture Studio can export a reviewed collection of presentations as an independent static learning site. This is the foundation for an experiment on scalableweb.dev, not an automatic publication of the nine university lectures.

## Try the pilot

From the Lecture Studio checkout:

```sh
rtk npm run export:study -- examples/self-study/course.json .local/self-study
rtk proxy python3 -m http.server 4320 --bind 127.0.0.1 --directory .local/self-study
```

Open `http://127.0.0.1:4320/`. Use HTTP, not `file://`: the runtime loads module JSON and JavaScript assets. The destination must not exist. Each export creates a fresh, reviewable snapshot and never overwrites an existing directory. Use another output directory for subsequent revisions.

The pilot has two modules, an Amdahl experiment, a knowledge check, a reflection, public explanations, and a Mermaid diagram. It deliberately contains private notes and an excluded classroom slide in the source so the export boundary is exercised. Neither is published.

## Author once; publish a reviewed snapshot

1. Author and rehearse in Obsidian as usual. Use **Download editable Markdown** to save a versioned deck for publication. This source export includes private notes, so do not publish it directly.
2. Put the referenced self-contained HTML demos alongside that versioned Markdown, preserving the relative paths. The exporter reads local files; it does not connect to Obsidian or load session state.
3. Add public explanations and activities using the `study` settings below. Mark university-only slides with `study.exclude: true`.
4. Select and order modules in a course configuration, export, inspect the generated site and public JSON, then hand the generated directory to the publishing project.

The exporter explicitly selects public fields. It omits speaker notes, build prompt bodies, build dependencies, poll room IDs/default choices, source filesystem paths, credentials, and live answers. It never copies the source Markdown or a whole presentation definition. HTML demos are deliberately published artifacts: keep private information out of their code and embedded data.

## Course configuration

```json
{
  "version": 1,
  "id": "scalable-web",
  "title": "Elements of Scalable Web Development",
  "description": "Read, experiment, and apply what you learn.",
  "modules": [
    {
      "id": "scalability",
      "source": "./decks/scalability.md",
      "title": "Understand scaling pressure",
      "description": "Explore the assumptions behind a scaling claim."
    }
  ]
}
```

`source` is relative to the configuration file. Module IDs are unique lowercase slugs; `title` is an optional override. Public steps follow authored slide order, excluding marked slides. Live graph detours become ordinary sections; the exporter does not infer a separate learning sequence. Use a dedicated versioned study deck if that sequence needs a substantial rewrite.

## Public authoring settings

Inside an existing slide's YAML:

```yaml
study:
  explanation: |
    Explain the point that the lecturer normally supplies aloud.
    Markdown, links, and Mermaid fences are supported.
  prompt: Predict what will happen before moving the slider.
  answer: |
    Explain the result and its assumptions, rather than only giving a number.
```

These are public fields, independent of `<!-- speaker-notes -->`. They are preserved by editable-Markdown export and ignored by the live presenter layout.

For a multiple-choice poll, add `study.correctOption: <option-id>` only when there is a defensible correct answer. Studio validates it against the declared options. The self-study view uses local choices and feedback. It never opens voting or uses the poll's default choice as the answer. Without `correctOption`, the activity remains a reflection. Answers are shipped in the public JSON: this is formative practice, not secure assessment.

Use `study.exclude: true` to omit classroom schedules, group formation, grading arrangements, or other inapplicable sections. Build slides retain their title and a generic placeholder; their implementation prompt is never exported. Replace live build sequences with public explanation, examples, or standalone demos as needed.

## Existing demos work independently

The same `demo: ./example.html` and `LectureDemo.onState` / `LectureDemo.setState` contract works. See [Interactive demo authoring](interactive-demos.md).

In self-study, the learner gets the `controller` role. The parent page stores bounded JSON state and returns it through the existing bridge. No Studio instance, presenter token, room backend, tunnel, or account is needed. Every browser has independent state. A reset sends `{}`, which should restore authored defaults. JSON state is limited to 16 KB and HTML to 250 KB, just as in the live integration.

Each demo runs inside `sandbox="allow-scripts"`, without same-origin permission. The exported HTML also carries a restrictive CSP meta tag for scripts, styles, images, and network access. The iframe attribute must be retained by any replacement renderer. For defense in depth, the host should also send a response CSP including `sandbox allow-scripts` on demo HTML, matching Studio's live response policy; this also covers direct navigation to a demo file. Keep headers for the learning pages separate from demo headers: demos intentionally use inline scripts/styles, while the parent uses external assets.

## Bundle contract, version 1

```text
index.html
course.json
assets/
  study.css
  study.mjs
  ...bundled JavaScript chunks (including Mermaid)
  lecture-assets/...       # only referenced packaged images
<module-id>/
  index.html
  module.json
  demos/<slide-id>.html
```

`course.json` has `format: "lecture-studio-study-course"`, `version: 1`, course metadata, and module entries with `id`, `title`, `description`, `href`, `data`, `revision`, and `steps` (count).

`module.json` has `format: "lecture-studio-study-module"`, `version: 1`, `courseId`, module metadata, a content `revision`, and ordered `steps`. Each step includes `id`, `title`, `chapter`, rendered public `html`, `source`, and `explanationHtml`; optional `activity` contains `promptHtml`, `answerHtml`, `options`, and optionally `correctOption`; optional `demo` contains `url` and `revision`. Optional `posterHtml` contains the static demo fallback separately from `html`; custom renderers should retain it for reading, print, loading, and failure states.

Runtime schemas/types are in `shared/study.ts`. Export logic is in `lib/study-export.ts`; the reference learner runtime and stylesheet are `public/study.ts` and `public/study.css`.

URLs are relative to the JSON file that contains them. Resolve a demo URL relative to its **module JSON**, not the course root. Module links use `index.html#slide-<id>` for stable deep links. The bundled runtime works under a nested prefix such as `/learn/pilot/`; no origin-root routes are required. Packaged `/lecture-assets/` images are copied and rewritten. Explicitly permitted remote images and external reading links still contact their original hosts.

Revisions are deterministic hashes of public module content and demo content. Local browser storage is keyed by course ID, module ID, and revision. A revised module starts fresh progress rather than applying stale answers or demo state. Private-note-only edits do not change the public revision. There is no cross-device sync or analytics. Storage failure leaves the page usable in memory; without JavaScript, all public reading sections and native explanation/discussion details remain available.

## Integration choices for scalableweb

**First experiment: host the complete bundle.** Copy the generated directory into the site's public assets under `/learn/pilot/`, keep relative paths intact, and add a link from the relevant book chapter or navigation. Serve `.mjs` as JavaScript and preserve the generated files. Replace the complete bundle on deployment so old chunks and JSON cannot be mixed with new content. No iframe around the whole learning site is required.

**Later: use the site's own page components.** Read `course.json` and `module.json` during the site's build and render its own course navigation and learning pages. Preserve public-field selection, stable slide IDs, Markdown output, iframe isolation, and the `LectureDemo` bridge. Use the JSON contracts rather than importing Studio's server or raw presentation definitions. The receiving project chooses its styling and deployment pipeline.

Recommended acceptance checks for the receiving project:

- Open a module directly by its slide link under the final URL prefix.
- Change a demo, reload, navigate away/back, and reset. A second browser context must start independently.
- Mark progress, return to the course index, and continue. Verify a revised module starts fresh.
- Check correct and incorrect options; reflection activities must not invent a correct answer.
- Check keyboard use, mobile width, no-JavaScript reading, blocked storage, and reading links.
- Inspect the public JSON and emitted files for private notes, classroom-only content, and build prompts.

The experiment's remaining work belongs in scalableweb: choose the public learning sequence, supply sufficient explanations and exercises, connect book chapters, and decide the publication/review process. Accounts, certificates, shared responses, graded assessment, and cross-device progress are not part of this foundation.

Local Markdown images and `demoPoster` assets are embedded in the exported HTML/JSON. Copy these files alongside the reviewed Markdown before export; see [local figure authoring](interactive-demos.md#local-figures-and-demo-reading-copies). Image changes update the module revision and reset its local study progress.

## Pilot fixes and consumer migration

Full HTML demo documents and fragments now produce a single parsed document with one doctype. The exporter preserves authored language, title, styles, and body, while inserting CSP metadata and the bridge before authored scripts. No receiving-side HTML repair step is needed.

Demo posters render in `.demo-poster`. The runtime sets `data-demo-status` on `.demo-host` to `loading`, `ready`, or `error`. `ready` means authored scripts finished loading and the initial state rendered; mounting an iframe is not enough. A ready demo hides its poster on screen. Print restores the poster and hides the interactive host. An empty host takes no space without JavaScript. Loading failures, initialization errors, and a ten-second initialization timeout retain the poster and explanatory Markdown, with a reload hint. Ordinary Markdown illustrations remain visible.

After pinning the fixed exporter, remove the downstream document-repair adapter (and its dedicated parse5 dependency if unused elsewhere), the alt-text-based poster hiding rule, and the empty-host CSS workaround. Preserve the host's CSP, JavaScript MIME types, and cache revalidation. Regenerate the complete bundle and rerun HTML validation, unit tests, and browser checks. Demo revisions include the generated bridge/document, so wrapper changes also invalidate stale learner state.

A standalone exporter npm package remains a separate enhancement. It should expose the CLI and export API with a bundled learner runtime, styles, Mermaid, and packaged assets, without Studio's development tools or backend configuration. Verify it in a clean consumer while retaining deterministic revisions, exclusions, and refusal to overwrite existing output.
