# Author the lecture in Obsidian

Obsidian owns the sequence, wording, speaker notes, references, activities and
build instructions. Studio loads a snapshot for presenting; it does not write
back to your vault. Existing JSON presentations remain supported.

## Move an existing deck to editable Markdown

With Live off, open the presentation menu and choose **Download editable
Markdown**. Replace the presentation note's content in Obsidian with this file
(keep a vault version/backup). The converted repository export at
`docs/presentations/web-development-2026.md` uses this format too. Conversion
preserves the existing slide IDs, content, notes and activity settings.

**Edit in Obsidian** opens the note in your active vault. Save edits there, then
choose **Reload from Obsidian** with Live off. Reload validates before replacing
the snapshot and resets the lecture session, just like loading a presentation.
Browse the outline to preview privately. Turn Live on explicitly to present.
No watch process changes the projection during your lecture.

## Format

`````markdown
# My lecture

## Presentation

```json
{ "version": 1, "title": "My lecture" }
```

````

## Slide: A concrete example

```json
{ "id": "example", "type": "material", "chapter": "Present" }
```

Write your slide here, using ordinary Markdown.

<!-- speaker-notes -->

Write private speaking notes here.

```

Use backtick fences (`json`) for metadata blocks. Each slide starts with
`## Slide:`.
Use level-three or deeper headings within slide text. Slide order follows the
note. `start` and `next` are optional; when omitted they follow that order.
Stable IDs connect polls, word clouds, builds and checkpoints. Existing metadata
such as `poll`, `uses`, `previewOf`, and `source` stays in each slide's JSON block.
Write title, body and notes outside that block.

## Reading copies

**Preview reading copy** opens `/slides`, generated from the loaded snapshot.
Notes, build instructions and live responses are excluded. Print that page to
save a PDF. It updates after an explicit reload from Obsidian.

Print uses an A4 reading layout with chapter breaks, grouped slide content,
wrapped code, readable tables and diagrams, and reference groups kept together.
Enable browser headers/footers if you want page numbers in a saved PDF. The
`browser-tests/print.spec.ts` check renders the full deck and attaches a PDF for
visual review.

For the deployed audience copy, save the downloaded Markdown as the versioned
export and run the normal build/deployment workflow. The build can also read a
chosen export with `node --import tsx scripts/build-handout.ts /path/to/lecture.md`.
The deployed copy remains static until deployment; do not independently edit it.
```
````
`````
