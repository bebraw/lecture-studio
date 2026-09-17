import type { WebDemo } from "../shared/models.ts";
import { record } from "../shared/errors.ts";
const frames = new WeakMap<
  Window,
  {
    view: WebDemo;
    element: HTMLIFrameElement;
    change?: (state: string) => void;
  }
>();
const listening = new WeakSet<Window>();
export function renderWebDemo(
  host: HTMLElement,
  view: WebDemo,
  change?: (state: string) => void,
) {
  const owner = host.ownerDocument.defaultView!;
  if (!listening.has(owner)) {
    listening.add(owner);
    owner.addEventListener("message", (event: MessageEvent<unknown>) => {
      const link = event.source && frames.get(event.source as Window);
      const message = record(event.data);
      if (
        !link?.element.isConnected ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      if (message.type === "lecture-demo:ready")
        (event.source as Window).postMessage(
          { type: "lecture-demo:state", state: link.view.state },
          "*",
        );
      if (
        message.type === "lecture-demo:update" &&
        typeof message.state === "string" &&
        message.state.length <= 16000
      )
        link.change?.(message.state);
    });
  }
  let frame = host.querySelector<HTMLIFrameElement>("iframe.web-demo-frame");
  if (!frame || frame.dataset.demoId !== view.id) {
    frame = host.ownerDocument.createElement("iframe");
    frame.className = "web-demo-frame";
    frame.dataset.demoId = view.id;
    frame.title = change
      ? "Interactive demo controls"
      : "Interactive demo projection";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.referrerPolicy = "no-referrer";
    frame.src = view.url + (change ? "?role=controller" : "");
    host.replaceChildren(frame);
  }
  if (frame.contentWindow) {
    frames.set(frame.contentWindow, {
      view,
      element: frame,
      ...(change ? { change } : {}),
    });
    frame.contentWindow.postMessage(
      { type: "lecture-demo:state", state: view.state },
      "*",
    );
  }
}
