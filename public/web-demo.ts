import type { WebDemo } from "../shared/models.ts";
import { record } from "../shared/errors.ts";
const frames = new WeakMap<
  Window,
  {
    view: WebDemo;
    element: HTMLIFrameElement;
    host: HTMLElement;
    change?: (state: string) => void;
  }
>();
const listening = new WeakSet<Window>();
function demoStatus(
  host: HTMLElement,
  element: HTMLIFrameElement,
  status: string,
) {
  if (!element.isConnected || element.parentElement !== host) return;
  if (host.dataset.demoStatus === status) return;
  host.dataset.demoStatus = status;
  host.dispatchEvent(new Event("demo-status"));
}
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
      if (message.type === "lecture-demo:rendered")
        demoStatus(link.host, link.element, "ready");
      if (message.type === "lecture-demo:error")
        demoStatus(link.host, link.element, "error");
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
    demoStatus(host, frame, "loading");
    const mounted = frame;
    owner.setTimeout(() => {
      if (host.dataset.demoStatus !== "ready")
        demoStatus(host, mounted, "error");
    }, 10000);
  }
  if (frame.contentWindow) {
    frames.set(frame.contentWindow, {
      view,
      element: frame,
      host,
      ...(change ? { change } : {}),
    });
    frame.contentWindow.postMessage(
      { type: "lecture-demo:state", state: view.state },
      "*",
    );
  }
}
