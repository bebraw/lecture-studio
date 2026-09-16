import test from "node:test";
import assert from "node:assert/strict";
import { previewFraming } from "../shared/preview-framing.ts";
test("only loopback previews allow lecture framing, preserving other CSP restrictions", async () => {
  const response = () =>
    new Response("demo", {
      headers: {
        "content-security-policy":
          "default-src 'self'; frame-ancestors 'none'; form-action 'self', object-src 'none'; frame-ancestors 'none'",
        "x-frame-options": "DENY",
      },
    });
  for (const origin of [
    "http://127.0.0.1:8790",
    "http://localhost:8790",
    "http://[::1]:8790",
  ]) {
    const result = previewFraming(new Request(origin), response());
    const csp = result.headers.get("content-security-policy")!;
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.equal(
      csp.split(
        "frame-ancestors http://127.0.0.1:* http://localhost:* https://live.scalableweb.dev",
      ).length,
      3,
    );
    assert.equal(result.headers.has("x-frame-options"), false);
    assert.equal(await result.text(), "demo");
  }
  for (const origin of [
    "https://example.com",
    "https://localhost",
    "http://127.0.0.1.attacker.example",
  ]) {
    const original = response();
    assert.equal(previewFraming(new Request(origin), original), original);
    assert.equal(original.headers.get("x-frame-options"), "DENY");
  }
});
