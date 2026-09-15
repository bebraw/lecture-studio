# Document A

A static SDLCAI seminar guide. This increment stops before the form.

## Frozen audience choices

- **Retro web:** readable serif text, monospace labels, underlined links, visible
  keyboard focus, and accessible contrast.
- **Repeating information:** preserve form choices; do not require repeat entry.
  Carry this requirement into the later form increment. Document A collects no
  input and does not implement or claim form persistence.

## Local preview and checks

Serve this directory on loopback port 4321, for example from the repository root:

```sh
rtk proxy python3 -m http.server 4321 --bind 127.0.0.1 --directory document-a
```

Open <http://127.0.0.1:4321>. With that server running:

```sh
rtk proxy node --import tsx document-a/check.ts
rtk proxy npx prettier --check document-a
```

If the port is occupied, serve on another loopback port and set `DOCUMENT_A_URL`
when running the check. This rehearsal preview uses <http://127.0.0.1:4322>.

The browser check covers desktop and narrow layouts without JavaScript, keyboard
navigation, internal links, and an automated accessibility scan. Screenshots are
saved under `/private/tmp/document-a-verified-*.png`.

Seminar facts are summarized from the linked official pages, checked on
15 September 2026. The official programme remains the source for updates.
