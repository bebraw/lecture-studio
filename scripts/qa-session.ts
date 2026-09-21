import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse, safeParse } from "valibot";
import { qaCredentialsSchema } from "../shared/qa.ts";
import { errorSchema } from "../shared/schemas.ts";
const [action, id, title, output, ...extra] = process.argv.slice(2);
if (
  !action ||
  !["create", "rotate"].includes(action) ||
  !id ||
  !/^[a-z0-9-]{1,60}$/.test(id) ||
  !title?.trim() ||
  title.length > 200 ||
  !output ||
  extra.length
)
  throw new Error(
    'Usage: npm run qa:session -- <create|rotate> <session-id> "Session title" <new-private-credentials.json>',
  );
const origin = new URL(
  process.env.LECTURE_POLL_ORIGIN || "https://live.scalableweb.dev",
);
if (
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  (origin.protocol !== "https:" &&
    !(
      origin.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(origin.hostname)
    ))
)
  throw new Error(
    "Use an HTTPS audience origin (HTTP is allowed only for local testing)",
  );
const token = process.env.LECTURE_POLL_TOKEN;
if (!token || token.length < 32)
  throw new Error(
    "Set LECTURE_POLL_TOKEN to the audience Worker's presenter credential",
  );
// Reserve a private destination before creating or rotating the remote credential.
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(
  output,
  "Provisioning in progress. If this operation fails after reaching the service, rotate the key and use a new output filename.\n",
  { mode: 0o600, flag: "wx" },
);
const response = await fetch(new URL("/presenter/qa/" + id, origin), {
  method: "POST",
  headers: {
    authorization: "Bearer " + token,
    "content-type": "application/json",
  },
  body: JSON.stringify({ action, title }),
  signal: AbortSignal.timeout(15000),
  redirect: "error",
});
if (!response.body) throw new Error("Empty response from audience service");
const reader = response.body.getReader();
let size = 0;
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  size += value.length;
  if (size > 8000) {
    await reader.cancel();
    throw new Error("Unexpectedly large service response");
  }
  chunks.push(value);
}
const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (!response.ok) {
  const error = safeParse(errorSchema, value);
  throw new Error(error.success ? error.output.error : "Session setup failed");
}
const credentials = parse(qaCredentialsSchema, value);
await writeFile(output, JSON.stringify(credentials, null, 2) + "\n", {
  mode: 0o600,
});
console.log(
  `Audience: ${credentials.audienceUrl}\nModerator: ${credentials.moderatorUrl}\nPrivate moderator key saved to ${resolve(output)}`,
);
