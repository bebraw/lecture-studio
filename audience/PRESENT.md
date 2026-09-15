# Present increment

The existing `/rooms/{room}` form retains its native POST and 303 redirect.
With JavaScript, the same form submits using fetch. Each open room or
`/rooms/{room}?projected=1` view polls its server-rendered aggregate every two
seconds while visible. Projection contains aggregate counts and no form.

Only the aggregate is replaced. Form focus and unsent choices survive updates;
session storage restores drafts on reload where available. The existing anonymous
voter cookie preserves submitted choices and replacement semantics without
JavaScript. Failed requests keep the selection and offer a retry. No automatic
POST retry occurs. Cookies are browser-specific, not cross-device identity.

The frozen theme is **Retro web**; the friction choice is **Repeating information**.
Document A remains the seminar guide. This increment uses the prepared room
backend and does not add model composition or deploy.

## Embedded live app

Room pages allow iframe embedding from the loopback studio, their own origin,
and `https://live.scalableweb.dev`. Other HTML views retain their embedding
restriction. A room with `frame-ancestors 'none'` renders as a broken grey iframe
on the stage even when opening it in a separate tab works.

After changing the Worker, restart any preview server that does not watch source
files, then reload the stage. Refreshing the browser alone cannot change the
server's response policy. Use the room URL (for example `/rooms/webdev-2026`)
for the interactive demo.

Enhanced submission handles the native redirect without fetching the audience
landing page, then refreshes the room aggregate directly. Both requests time out
after eight seconds so a stalled connection cannot leave submission or polling
permanently busy. The native JavaScript-disabled form keeps its POST/303 flow.

## Verification

```sh
rtk proxy npm run test:browser -- browser-tests/room-enhancement.spec.ts browser-tests/audience.spec.ts
rtk proxy npm run test:browser -- browser-tests/live-app-preview.spec.ts
```

Fixtures use disposable local Worker storage. Coverage includes independent voter
and projection browser contexts, saved and unsent selections, vote replacement,
request failure, lock propagation, mobile layout, accessibility, and native
JavaScript-disabled submission. This is local verification, not a public rollout.
