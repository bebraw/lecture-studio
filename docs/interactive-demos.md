# Interactive demos from Obsidian

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
