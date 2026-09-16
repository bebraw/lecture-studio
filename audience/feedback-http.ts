import { asError } from "../shared/errors.ts";
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Expected JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk: { done: boolean; value?: unknown } = await reader.read();
    const { done, value } = chunk;
    if (done) break;
    if (!(value instanceof Uint8Array))
      throw new Error("Expected request bytes");
    size += value.length;
    if (size > 4096) {
      await reader.cancel();
      throw new Error("Submission too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Expected JSON object");
  return body as Record<string, unknown>;
}
const json = (value: unknown, status = 200, extra = {}) =>
  Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });
export async function feedbackRequest(
  request: Request,
  env: Env,
  admin: boolean,
) {
  const object = env.STAGE_STATE.getByName("lecture"),
    url = new URL(request.url);
  try {
    if (request.method === "GET")
      return json(
        admin
          ? await object.feedbackPrivate(
              url.searchParams.get("mode") === "questions",
            )
          : await object.feedbackPublic(
              url.searchParams.get("mode") === "questions",
            ),
      );
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Expected JSON" }, 415);
    if (
      !admin &&
      (request.headers.get("origin") !== url.origin ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return json({ error: "Same-origin submission required" }, 403);
    const body = await readBody(request);
    if (admin)
      return json(await object.feedbackManage(String(body.action), body));
    if (typeof body.round !== "string" || typeof body.text !== "string")
      return json({ error: "Missing response" }, 400);
    const existing = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)lecture_feedback=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const id = existing || crypto.randomUUID();
    const hash = async (value: string) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              env.PRESENTER_TOKEN + ":" + body.round + ":" + value,
            ),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
    const result = await object.feedbackSubmit(
      body.round,
      body.text,
      await hash(id),
      await hash(request.headers.get("cf-connecting-ip") || "local"),
    );
    const cookie = existing
      ? {}
      : {
          "set-cookie":
            "lecture_feedback=" +
            id +
            "; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400" +
            (url.protocol === "https:" ? "; Secure" : ""),
        };
    return json(
      result.error ? { error: result.error } : { ok: true },
      result.status,
      cookie,
    );
  } catch (caught) {
    const error = asError(caught);
    return json(
      {
        error: error instanceof Error ? error.message : "Feedback unavailable",
      },
      400,
    );
  }
}
