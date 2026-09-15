export function previewCandidates(
  messages: { text: string }[],
  ownOrigin: string,
) {
  const own = new URL(ownOrigin),
    found = new Set<string>();
  for (const message of messages || []) {
    for (const match of String(message.text || "").matchAll(
      /https?:\/\/[^\s<>"'`]+/g,
    )) {
      try {
        const value = match[0].replace(/[),.;!]+$/, "");
        const url = new URL(value);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
          continue;
        if (
          !url.port ||
          url.port === own.port ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          continue;
        if (/\/(?:api|json|devtools)(?:\/|$)/i.test(url.pathname)) continue;
        found.add(url.href);
      } catch {
        /* Incomplete streamed URLs are not actionable. */
      }
    }
  }
  return [...found].slice(-8);
}
