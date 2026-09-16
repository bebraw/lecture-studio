/** Only local rehearsal responses may be embedded by the lecture surfaces. */
export function previewFraming(request: Request, response: Response) {
  const url = new URL(request.url);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  )
    return response;
  const headers = new Headers(response.headers);
  const policy = headers.get("content-security-policy") || "";
  const ancestors =
    "frame-ancestors http://127.0.0.1:* http://localhost:* https://live.scalableweb.dev";
  // Preserve each enforced policy and every non-framing directive.
  headers.set(
    "content-security-policy",
    policy
      .split(",")
      .map((part) => {
        const rest = part
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s && !/^frame-ancestors(?:\s|$)/i.test(s));
        return [...rest, ancestors].join("; ");
      })
      .join(", "),
  );
  headers.delete("x-frame-options");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
