import { parse } from "valibot";
import { audienceStageSchema } from "../shared/audience-schemas.ts";
import { handleRoomRequest, readRoomSnapshot } from "./room-http";
import { renderRoomFragment } from "./room-view";
import { feedbackRequest } from "./feedback-http";
import type { JsonValue } from "./stage-state";
export { RoomState } from "./room-state";
export { StageState } from "./stage-state";

const rooms: Record<
  string,
  { question: string; choices: { id: string; label: string }[] }
> = {
  "webdev-2026-friction": {
    question: "What feels unnecessarily difficult on the web?",
    choices: [
      { id: "finding", label: "Finding information" },
      { id: "repeating", label: "Repeating information" },
      { id: "navigation", label: "Navigating interfaces" },
      { id: "trust", label: "Knowing what to trust" },
    ],
  },
  "webdev-2026": {
    question: "Which visual theme should shape our app?",
    choices: [
      { id: "editorial", label: "Editorial" },
      { id: "retro-web", label: "Retro web" },
      { id: "playful", label: "Playful" },
    ],
  },
  "webdev-2026-priority": {
    question: "What should the seminar view prioritize?",
    choices: [
      { id: "overview", label: "Quick overview" },
      { id: "learning", label: "Learning outcomes" },
      { id: "practical", label: "Practical details" },
    ],
  },
};
function html(title: string, body: string, embeddableRoom = false) {
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
      title +
      '</title><link rel="stylesheet" href="/style.css"><main><h1>' +
      title +
      "</h1>" +
      body +
      "</main></html>",
    {
      headers: {
        "content-type": "text/html;charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy":
          "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors " +
          (embeddableRoom
            ? "'self' http://127.0.0.1:* http://localhost:* https://live.scalableweb.dev"
            : "'none'"),
        "x-content-type-options": "nosniff",
        "referrer-policy": "same-origin",
      },
    },
  );
}
async function authorized(request: Request, secret: string) {
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  if (supplied.length > 4096) return false;
  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode("Bearer " + secret)),
  ]);
  return crypto.subtle.timingSafeEqual(suppliedHash, expectedHash);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/feedback")
      return feedbackRequest(request, env, false);
    if (url.pathname === "/presenter/feedback") {
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      return feedbackRequest(request, env, true);
    }
    if (url.pathname === "/presenter/stage") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      if (!request.body) return new Response("Expected stage", { status: 400 });
      const reader = request.body.getReader();
      while (true) {
        const chunk: { done: boolean; value?: unknown } = await reader.read();
        const { done, value } = chunk;
        if (done) break;
        if (!(value instanceof Uint8Array))
          throw new Error("Expected request bytes");
        bytes += value.length;
        if (bytes > 100000) {
          await reader.cancel();
          return new Response("Too large", { status: 413 });
        }
        chunks.push(value);
      }
      try {
        const buffer = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
        const input = parse(
          audienceStageSchema,
          JSON.parse(new TextDecoder().decode(buffer)),
        );
        if (
          !input ||
          typeof input.title !== "string" ||
          typeof input.html !== "string"
        )
          throw new Error();
        if (input.live === false) {
          const snapshots = await Promise.all(
            Object.keys(rooms).map((id) =>
              env.ROOM_STATE.getByName(id).getSnapshot(),
            ),
          );
          if (snapshots.some((s) => s.status === "open"))
            return new Response("Close voting before turning Live off", {
              status: 409,
            });
        }
        const stage: Record<string, JsonValue> = {};
        for (const key of [
          "live",
          "act",
          "mode",
          "title",
          "html",
          "source",
          "diagram",
          "demoUrl",
          "version",
          "theme",
          "blank",
          "build",
          "slidePosition",
          "slideType",
        ] as const)
          if (input[key] !== undefined) stage[key] = input[key];
        await env.STAGE_STATE.getByName("lecture").publish(stage);
        return Response.json({ ok: true });
      } catch {
        return new Response("Invalid stage", { status: 400 });
      }
    }
    if (url.pathname === "/api/audience" && request.method === "GET") {
      const stage = await env.STAGE_STATE.getByName("lecture").read();
      if (stage?.live === false)
        return Response.json(
          { stage: null, poll: null },
          {
            headers: {
              "cache-control": "no-store",
              "x-content-type-options": "nosniff",
            },
          },
        );
      const snapshots = await Promise.all(
        Object.keys(rooms).map(async (id) => ({
          id,
          snapshot: await readRoomSnapshot(request, env, id),
        })),
      );
      const active = snapshots.find((item) => item.snapshot.status === "open");
      return Response.json(
        {
          stage,
          poll: active
            ? {
                id: active.id,
                question: rooms[active.id]?.question ?? "",
                html: renderRoomFragment({
                  roomId: active.id,
                  snapshot: active.snapshot,
                  hideResults: true,
                }),
              }
            : null,
        },
        {
          headers: {
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        },
      );
    }
    if (
      request.method === "GET" &&
      (url.pathname === "/" ||
        [
          "/style.css",
          "/audience.css",
          "/audience.mjs",
          "/seminar-browser.mjs",
          "/room.css",
          "/shared.mjs",
        ].includes(url.pathname) ||
        url.pathname.startsWith("/vendor/mermaid/"))
    ) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set(
        "content-security-policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-src https:; object-src 'none'; base-uri 'none'; frame-ancestors http://127.0.0.1:* http://localhost:*; form-action 'self'",
      );
      response.headers.set("referrer-policy", "same-origin");
      response.headers.set("x-content-type-options", "nosniff");
      return response;
    }
    const match =
      /^\/(rooms|api\/rooms|presenter\/rooms)\/([a-z0-9-]+)(?:\/(seed|open|open-session|lock))?$/.exec(
        url.pathname,
      );
    if (!match?.[2] || !Object.hasOwn(rooms, match[2]))
      return new Response("Not found", { status: 404 });
    const [, kind, , requestedOperation] = match;
    const id = match[2];
    const definition = rooms[id];
    if (!definition) return new Response("Not found", { status: 404 });
    const operation =
      requestedOperation === "open-session" ? "open" : requestedOperation;
    const room = env.ROOM_STATE.getByName(id);
    if (kind === "presenter/rooms") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      if (!operation) return new Response("Not found", { status: 404 });
      if (operation === "open") {
        const others = await Promise.all(
          Object.keys(rooms)
            .filter((key) => key !== id)
            .map((key) => env.ROOM_STATE.getByName(key).getSnapshot()),
        );
        if (others.some((snapshot) => snapshot.status === "open"))
          return new Response("Close the current vote first", { status: 409 });
      }
      if (operation === "seed") {
        // Only initialize an empty room. Repeated setup never resets existing votes.
        await room.initializeChoices(definition.choices);
      } else if (requestedOperation === "open-session") {
        const session = request.headers.get("X-Lecture-Session") || "";
        if (!/^[a-zA-Z0-9-]{1,80}$/.test(session))
          return new Response("Invalid lecture session", { status: 400 });
        await room.openSession(session);
      } else await room.setStatus(operation === "open" ? "open" : "locked");
    } else if (operation) return new Response("Not found", { status: 404 });
    else if (kind === "rooms") {
      if (request.method === "GET") {
        const snapshot = await readRoomSnapshot(request, env, id);
        return html(
          definition.question,
          '<link rel="stylesheet" href="/room.css"><script type="module" src="/seminar-browser.mjs"></script>' +
            renderRoomFragment({
              roomId: id,
              snapshot,
              projected: url.searchParams.has("projected"),
            }) +
            '<p><a href="/rooms/' +
            id +
            '?projected=1">Projected results</a></p>' +
            '<p><a href="/">All polls</a> · <a href="/rooms/' +
            id +
            '">Refresh results</a></p><p>Your browser remembers your vote. Changing your choice replaces it.</p>',
          true,
        );
      }
      const response = await handleRoomRequest(request, env, {
        voterCookieMaxAgeSeconds: 14400,
      });
      if (response?.status === 303) {
        const next = new Response(response.body, response);
        next.headers.set("location", "/");
        return next;
      }
      return response || new Response("Not found", { status: 404 });
    } else if (request.method !== "GET")
      return new Response("Method not allowed", { status: 405 });
    const snapshot = await room.getSnapshot();
    return Response.json(
      {
        choices: snapshot.choices,
        status: snapshot.status,
        revision: snapshot.revision,
        totalVotes: snapshot.totalVotes,
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  },
};
