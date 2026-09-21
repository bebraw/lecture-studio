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
