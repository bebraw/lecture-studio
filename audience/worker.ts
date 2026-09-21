import { audienceProtocol } from "../shared/audience-protocol.ts";
import { audienceRooms as rooms } from "../shared/audience-rooms.ts";
import { parse } from "valibot";
import { demoDocument } from "../shared/demo-document.ts";
import { demoCsp } from "../shared/web-demo.ts";
import { audiencePublicationSchema } from "../shared/audience-schemas.ts";
import { handleRoomRequest, readRoomSnapshot } from "./room-http";
import { renderRoomFragment } from "./room-view";
import { validatePoll } from "../shared/poll-definition.ts";
import { feedbackRequest, readBody } from "./feedback-http";
import type { JsonValue } from "./stage-state";
export { RoomState } from "./room-state";
export { StageState } from "./stage-state";

const escapeText = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
async function roomIds(env: Env) {
  return [
    ...new Set([
      ...Object.keys(rooms),
      ...(await env.STAGE_STATE.getByName("lecture").pollRooms()),
    ]),
  ];
}
async function roomDefinition(env: Env, id: string) {
  const prepared = await env.ROOM_STATE.getByName(id).getDefinition();
  return prepared
    ? { question: prepared.question, choices: prepared.options }
    : rooms[id];
}
function html(title: string, body: string, embeddableRoom = false) {
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
      escapeText(title) +
      '</title><link rel="stylesheet" href="/style.css"><main><h1>' +
      escapeText(title) +
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
    if (url.pathname === "/presenter/presence") {
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      if (request.method !== "GET")
        return new Response("Method not allowed", { status: 405 });
      return Response.json(
        await env.STAGE_STATE.getByName("lecture").presence(),
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (url.pathname === "/api/presence") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (
        request.headers.get("origin") !== url.origin ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        return new Response("Same-origin request required", { status: 403 });
      const existing = request.headers
        .get("cookie")
        ?.match(/(?:^|;\s*)lecture_presence=([a-f0-9-]{36})(?:;|$)/)?.[1];
      const id = existing || crypto.randomUUID();
      await env.STAGE_STATE.getByName("lecture").presence(id);
      return new Response(null, {
        status: 204,
        headers: {
          "cache-control": "no-store",
          ...(!existing
            ? {
                "set-cookie": `lecture_presence=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`,
              }
            : {}),
        },
      });
    }
    if (url.pathname === "/api/capabilities" && request.method === "GET")
      return Response.json(audienceProtocol, {
        headers: { "cache-control": "no-store" },
      });
    if (url.pathname === "/api/feedback")
      return feedbackRequest(request, env, false);
    if (url.pathname === "/presenter/feedback") {
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      return feedbackRequest(request, env, true);
    }
    if (url.pathname === "/presenter/reset-lecture") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      for (const id of await roomIds(env)) {
        const room = env.ROOM_STATE.getByName(id);
        await room.setStatus("locked");
        await room.resetVotes();
      }
      await env.STAGE_STATE.getByName("lecture").resetFeedback();
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/presenter/close-polls") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      for (const id of await roomIds(env)) {
        const room = env.ROOM_STATE.getByName(id);
        if ((await room.getSnapshot()).status === "open")
          await room.setStatus("locked");
      }
      return new Response(null, { status: 204 });
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
        if (bytes > 1700000) {
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
          audiencePublicationSchema,
          JSON.parse(new TextDecoder().decode(buffer)),
        );
        if (
          !input ||
          typeof input.title !== "string" ||
          typeof input.html !== "string"
        )
          throw new Error();
        if (
          input.webDemo &&
          input.webDemo.url !== "/audience-demo/" + input.webDemo.id
        )
          throw new Error("Invalid demo URL");
        if (
          input.demoHtml !== undefined &&
          (!input.webDemo || input.live !== true || input.blank)
        )
          throw new Error("Demo requires a live stage");
        if (
          new TextEncoder().encode(
            JSON.stringify({ ...input, demoHtml: undefined }),
          ).length > 100000
        )
          throw new Error("Stage too large");
        if (input.live === false) {
          const snapshots = await Promise.all(
            (await roomIds(env)).map((id) =>
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
          "identity",
          "blank",
          "build",
          "slidePosition",
          "slideType",
          "projectionKind",
          "pollId",
          "webDemo",
        ] as const)
          if (input[key] !== undefined) stage[key] = input[key];
        if (
          !(await env.STAGE_STATE.getByName("lecture").publish(
            stage,
            input.demoHtml,
          ))
        )
          return new Response("Demo HTML required", { status: 409 });
        return Response.json({ ok: true });
      } catch {
        return new Response("Invalid stage", { status: 400 });
      }
    }
    const demoMatch = /^\/audience-demo\/([a-f0-9-]{36})$/.exec(url.pathname);
    if (demoMatch) {
      if (request.method !== "GET")
        return new Response("Method not allowed", { status: 405 });
      const demo = await env.STAGE_STATE.getByName("lecture").readDemo(
        demoMatch[1]!,
      );
      return new Response(
        demo === null ? "Demo is no longer live" : demoDocument(demo, false),
        {
          status: demo === null ? 404 : 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-security-policy": demoCsp,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            "referrer-policy": "no-referrer",
          },
        },
      );
    }
    if (url.pathname === "/api/audience" && request.method === "GET") {
      const { active: followers } =
        await env.STAGE_STATE.getByName("lecture").presence();
      const stage = await env.STAGE_STATE.getByName("lecture").read();
      if (stage?.live === false)
        return Response.json(
          { stage: null, poll: null, active: followers },
          {
            headers: {
              "cache-control": "no-store",
              "x-content-type-options": "nosniff",
            },
          },
        );
      const snapshots = await Promise.all(
        (await roomIds(env)).map(async (id) => ({
          id,
          snapshot: await readRoomSnapshot(request, env, id),
        })),
      );
      const active = snapshots.find(
        (item) =>
          item.snapshot.status === "open" &&
          stage?.projectionKind === "poll" &&
          stage.pollId === item.id,
      );
      return Response.json(
        {
          stage,
          active: followers,
          poll: active
            ? {
                id: active.id,
                question:
                  (await roomDefinition(env, active.id))?.question ?? "",
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
          "/identity.css",
          "/audience.css",
          "/audience.mjs",
          "/seminar-browser.mjs",
          "/room.css",
          "/shared.mjs",
          "/slides",
          "/slides.css",
          "/slides.mjs",
        ].includes(url.pathname) ||
        url.pathname.startsWith("/vendor/mermaid/") ||
        url.pathname.startsWith("/lecture-assets/") ||
        url.pathname === "/hypotheses")
    ) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set(
        "content-security-policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors http://127.0.0.1:* http://localhost:*; form-action 'self'",
      );
      response.headers.set("referrer-policy", "same-origin");
      response.headers.set("x-content-type-options", "nosniff");
      return response;
    }
    const match =
      /^\/(rooms|api\/rooms|presenter\/rooms)\/([a-z0-9-]+)(?:\/(seed|open|open-session|lock|prepare))?$/.exec(
        url.pathname,
      );
    if (!match?.[2] || match[2].length > 80)
      return new Response("Not found", { status: 404 });
    const [, kind, , requestedOperation] = match;
    const id = match[2];
    if (kind === "presenter/rooms" && requestedOperation === "prepare") {
      if (request.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return new Response("Unauthorized", { status: 401 });
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return new Response("Expected JSON", { status: 415 });
      try {
        const poll = validatePoll(await readBody(request));
        await env.STAGE_STATE.getByName("lecture").registerPollRoom(id);
        const snapshot = await env.ROOM_STATE.getByName(id).preparePoll(poll);
        return Response.json(snapshot, {
          headers: { "cache-control": "no-store" },
        });
      } catch (error) {
        const conflict =
          error instanceof Error && error.message.includes("conflicts");
        return new Response(
          conflict
            ? "Poll definition conflicts with existing votes or open voting"
            : "Invalid poll definition",
          { status: conflict ? 409 : 400 },
        );
      }
    }
    if (!(await roomIds(env)).includes(id))
      return new Response("Not found", { status: 404 });
    const definition = await roomDefinition(env, id);
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
        await room.initializeChoices(definition.choices);
        const others = await Promise.all(
          (await roomIds(env))
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
