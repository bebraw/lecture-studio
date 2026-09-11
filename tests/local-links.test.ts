import test from "node:test";
import assert from "node:assert/strict";
import { createStudio } from "../server.ts";
test("short local URLs supply only their role token and reject cross-site reads", async () => {
  const studio = createStudio({ port: 0, persist: false });
  const a = await studio.start();
  try {
    assert.equal(a.deskUrl, a.origin + "/desk");
    assert.equal(a.stageUrl, a.origin + "/stage");
    const desk = await (await fetch(a.deskUrl)).text(),
      stage = await (await fetch(a.stageUrl)).text();
    assert.ok(desk.includes('content="' + a.deskToken + '"'));
    assert.ok(stage.includes('content="' + a.stageToken + '"'));
    assert.ok(!stage.includes(a.deskToken));
    assert.equal(
      (await fetch(a.deskUrl, { headers: { "sec-fetch-site": "cross-site" } }))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(a.origin + "/api/desk", {
          headers: { authorization: "Bearer " + a.stageToken },
        })
      ).status,
      401,
    );
  } finally {
    await new Promise((resolve) => studio.server.close(resolve));
  }
});
