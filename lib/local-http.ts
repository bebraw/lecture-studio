import type { IncomingMessage } from "node:http";
import { record } from "../shared/errors.ts";
export async function readJson(request: IncomingMessage) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new Error("Expected JSON");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const bytes: Buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > 100000) throw new Error("Request is too large");
    chunks.push(bytes);
  }
  return record(JSON.parse(Buffer.concat(chunks).toString()));
}
