# Interactive demos from Obsidian

The same demo API also supports an independent learner. The [self-study exporter](self-study-handover.md)
packages HTML demos with a browser-local controller, so learners can experiment without a live lecture or Studio server.

Put a self-contained HTML file beside the presentation note. Reference it in a material slide's YAML:

````markdown
## Slide: More workers, same sequential work

```yaml
id: amdahl
type: material
demo: ./amdahl.html
source: "Adapted from scalableweb.dev — Amdahl’s law"
```

Increasing parallel capacity cannot remove the sequential portion of a fixed workload.
````

The Markdown body is the reading-copy fallback. The lecturer sees the interactive HTML on the desk; the projector shows its synchronized viewer. Load or **Reload from Obsidian** captures the HTML with the deck. Editing the file does not change a running presentation until reload.

Copy [amdahl.html](../examples/demos/amdahl.html) into your Obsidian presentation folder for a complete starting example. Use the same two-method interface for laws, statecharts, or scalability demonstrations:

```html
<output id="value"></output>
<button id="advance">Advance</button>
<script>
  let state;
  LectureDemo.onState((next) => {
    state = { count: 0, ...next };
    document.getElementById("value").textContent = state.count;
  });
  const button = document.getElementById("advance");
  button.hidden = LectureDemo.role !== "controller";
  button.onclick = () => LectureDemo.setState({ count: state.count + 1 });
</script>
```

- `LectureDemo.role` is `controller` on the desk and `viewer` on the projector.
- `LectureDemo.onState(render)` calls your render function with the current JSON object, initially `{}`. Supply your defaults there. Render functions should not call `setState`.
- `LectureDemo.setState(object)` replaces the full shared state. Call it from lecturer interactions. Viewers cannot update it. Keep state below 16 KB; functions, DOM elements and cycles are not JSON state.
- All visible behavior must derive from shared state. Store slider values, active statechart nodes, and selected scenarios in it. Local randomness, clocks, and animation progress are not synchronized.
- State is retained per slide when navigating away and back. **Reset demo** sends `{}`. Reloading or restarting the presentation resets all demo states.
- With Live off, changes are private. With Live on, the projected demo follows desk changes on the projector's next refresh, normally within one second. An off-screen demo does not replace a different projected slide.

Each file can contain inline HTML, CSS, JavaScript and data-URL images/fonts, up to 250 KB. Use a `./` path ending in `.html`, optionally in a subdirectory; parent traversal and external URLs are not supported. Scripts run in an isolated iframe: no network requests, external dependencies, storage access, forms, popups, or access to studio credentials. Bundle any libraries into the file. Ordinary Markdown HTML remains inert.

For a statechart, publish the active states and event history after each accepted event, and render them in `onState`. For a scalability illustration, publish the selected pressures and derive the diagram from those values. The integration is independent of the demo's framework.

This first integration supports the lecturer and local projector. Student devices show a message to follow the projector; HTML and demo state are not sent to the public audience service. Reading copies retain the slide's explanatory Markdown, not a live demo.

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

Keep explanatory Markdown below the metadata. `demoPoster` appears alongside that text in `/slides`, printed reading copies, and the self-study export. It is an authored image, not an automatic screenshot. Interactive demos continue to use their HTML and synchronized state.

References must start with `./` and stay within the presentation directory; parent traversal and external image references are not local assets. Images are limited to 2 MB each and 16 MB per deck. Export rejects symlinks that escape the presentation directory. SVGs render as images, never inline HTML, so their scripts cannot run. Image data is embedded in rendered output for portable exports; original Markdown references remain unchanged.

The public audience service has a 100 KB stage limit. If embedded images exceed the publication budget, students see a pointer to the projector or reading copy; the local projector and exported copy retain the figures. Public HTML demo mirroring remains separate future work.
