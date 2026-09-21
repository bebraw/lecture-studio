import { parse } from "valibot";
import { authorized } from "./authorization.ts";
import { feedbackRequest, readBody } from "./feedback-http.ts";
import { qaPage } from "./qa-view.ts";
import { qaActionSchema, qaSetupSchema } from "../shared/qa.ts";
const headers = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const json = (
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) => Response.json(body, { status, headers: { ...headers, ...extra } });
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
export async function handleQa(request: Request, env: Env) {
  const url = new URL(request.url);
  if (
    url.protocol !== "https:" &&
    !["127.0.0.1", "localhost"].includes(url.hostname)
  ) {
    if (request.method === "GET") {
      url.protocol = "https:";
      return new Response(null, {
        status: 308,
        headers: { ...headers, location: url.href },
      });
    }
    return json({ error: "HTTPS required" }, 400);
  }
  const setup = /^\/presenter\/qa\/([a-z0-9-]{1,60})$/.exec(url.pathname);
  const match =
    /^\/q\/([a-z0-9-]{1,60})(?:\/(moderate|state|questions|login|logout|manage))?$/.exec(
      url.pathname,
    );
  if (!setup && !match) return json({ error: "Not found" }, 404);
  const id = (setup || match)![1]!;
  const session = env.QUESTION_SESSIONS.getByName(id);
  try {
    if (setup) {
      if (!(await authorized(request, env.PRESENTER_TOKEN)))
        return json({ error: "Unauthorized" }, 401);
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405);
      const input = parse(qaSetupSchema, await readBody(request));
      const key = token();
      if (
        !(await session.configure(input.action, input.title, await hash(key)))
      )
        return json(
          {
            error:
              input.action === "create"
                ? "Session already exists; choose another ID or rotate its moderator key"
                : "Session does not exist",
          },
          409,
        );
      return json(
        {
          audienceUrl: url.origin + "/q/" + id,
          moderatorUrl: url.origin + "/q/" + id + "/moderate",
          moderatorKey: key,
        },
        201,
      );
    }
    const info = await session.publicSession();
    if (!info) return json({ error: "Session not found" }, 404);
    const operation = match![2];
    if (request.method !== "GET" && request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (
      request.method === "POST" &&
      (request.headers.get("origin") !== url.origin ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return json({ error: "Same-origin request required" }, 403);
    const cookie = (value: string, age: number) =>
      `qa_moderator=${value}; Path=/q/${id}/; HttpOnly; SameSite=Strict; Max-Age=${age}${url.protocol === "https:" ? "; Secure" : ""}`;
    const stored = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)qa_moderator=([a-f0-9]{64})(?:;|$)/)?.[1];
    const sessionHash = stored ? await hash(stored) : "";
    if (operation === "login" && request.method === "POST") {
      const body = await readBody(request);
      if (typeof body.key !== "string" || body.key.length > 128)
        return json({ error: "Enter a moderator key" }, 400);
      const value = token();
      const status = await session.login(
        await hash(body.key),
        await hash(value),
        await hash(
          env.PRESENTER_TOKEN +
            ":" +
            id +
            ":" +
            (request.headers.get("cf-connecting-ip") || "local"),
        ),
      );
      return status === 200
        ? json({ ok: true }, 200, { "set-cookie": cookie(value, 8 * 3600) })
        : json(
            {
              error:
                status === 429
                  ? "Too many sign-in attempts; try again in a minute"
                  : "Invalid moderator key",
            },
            status,
          );
    }
    if (operation === "manage" || operation === "logout") {
      if (!sessionHash || !(await session.authenticated(sessionHash)))
        return json({ error: "Sign in to moderate this session" }, 401);
      if (operation === "logout" && request.method === "POST") {
        await session.logout(sessionHash);
        return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
      }
      if (operation === "manage" && request.method === "GET")
        return json(await session.privateSession());
      if (operation === "manage" && request.method === "POST") {
        const input = parse(qaActionSchema, await readBody(request));
        return json(await session.manage(input.action, input.id));
      }
      return json({ error: "Method not allowed" }, 405);
    }
    if (operation === "state" && request.method === "GET") return json(info);
    if (operation === "questions" && request.method === "POST")
      return feedbackRequest(request, env, false, session);
    if ((!operation || operation === "moderate") && request.method === "GET")
      return new Response(qaPage(info.title, operation === "moderate"), {
        headers: {
          ...headers,
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        },
      });
    return json({ error: "Method not allowed" }, 405);
  } catch {
    return json(
      { error: "Invalid request or expired question; refresh and try again" },
      400,
    );
  }
}
