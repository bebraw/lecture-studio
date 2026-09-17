export const demoCsp =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; sandbox allow-scripts";
export function validateDemoState(state: string) {
  if (new TextEncoder().encode(state).length > 16000)
    throw new Error("Demo state exceeds 16 KB");
  const value: unknown = JSON.parse(state);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Demo state must be a JSON object");
  return JSON.stringify(value);
}
export function demoDocument(html: string, controller: boolean) {
  // This bootstrap executes before authored scripts, inside an opaque-origin sandbox.
  const bootstrap = `<script>(()=>{let state={},listeners=[];const role=${JSON.stringify(controller ? "controller" : "viewer")};window.LectureDemo={role,onState(fn){listeners.push(fn);fn(state)},setState(value){if(role==="controller")parent.postMessage({type:"lecture-demo:update",state:JSON.stringify(value)},"*")}};addEventListener("message",event=>{if(event.source!==parent||event.data?.type!=="lecture-demo:state")return;state=JSON.parse(event.data.state);for(const fn of listeners)fn(state)});parent.postMessage({type:"lecture-demo:ready"},"*")})();</script>`;
  return (
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
    bootstrap +
    html
  );
}
