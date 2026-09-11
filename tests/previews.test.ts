import { parse } from "valibot";
import { audienceStageSchema } from "../shared/audience-schemas.ts";
import { stringValue } from "../shared/errors.ts";
import { parseApiResponse } from "../shared/api.ts";
import { httpResult } from "./http-result.ts";
import type { Stage } from "../shared/models.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { previewCandidates } from "../public/shared.ts";
import { fixture } from "./fixture.ts";

test("preview detection filters docs, credentials, API endpoints and studio aliases", () => {
  const urls = previewCandidates(
    [
      {
        text: "Preview: [app](http://localhost:8799/rooms/demo). http://localhost:8799/rooms/demo https://docs.example.com http://localhost:4317/desk http://user:pass@localhost:8799/ http://localhost:8799/?token=secret http://localhost:8799/api/votes",
      },
    ],
    "http://127.0.0.1:4317",
  );
  assert.deepEqual(urls, ["http://localhost:8799/rooms/demo"]);
});
test("preview handoff preserves published material and an unrelated private draft", async (t) => {
  const { studio, address } = await fixture();
  t.after(() => studio.server.close());
  const call = async (
    path: string,
    body: unknown,
    token = address.deskToken,
  ) => {
    const res = await fetch(address.origin + "/api/" + path, {
      method: "POST",
      headers: {
        Origin: address.origin,
        Authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return httpResult("desk", res);
  };
  const first = parseApiResponse(
    "desk",
    await (
      await fetch(address.origin + "/api/desk", {
        headers: { Authorization: "Bearer " + address.deskToken },
      })
    ).json(),
  );
  await call("draft", { ...first.draft, title: "Private unsent draft" });
  assert.equal(
    (
      await call(
        "show-preview",
        { url: "http://localhost:8799/" },
        address.stageToken,
      )
    ).status,
    401,
  );
  const shown = (
    await call("show-preview", { url: "http://localhost:8799/" })
  ).data();
  assert.equal(shown.stage.mode, "demo");
  assert.equal(shown.draft.title, "Private unsent draft");
  await call("show-preview", { url: "http://localhost:8799/another" });
  const restored = (await call("back-material", {})).data();
  assert.equal(restored.stage.title, first.stage.title);
  assert.equal(restored.draft.title, "Private unsent draft");
  assert.equal(restored.canReturnToMaterial, false);
});

test("live preview shares HTTPS with audience while keeping local stage URL", async (t) => {
  const { AudiencePoll } = await import("../lib/audience-poll.ts");
  const sent: Partial<Stage>[] = [];
  let shared = "",
    closed = false;
  const tunnel = {
    pending: null,
    async open(url: string) {
      shared = url;
      return url;
    },
    publicUrl(url: string) {
      return shared === url ? "https://demo.trycloudflare.com/" : url;
    },
    close() {
      closed = true;
      shared = "";
    },
  };
  const poll = new AudiencePoll({
    origin: "https://audience.invalid",
    token: "test",
    fetcher: async (_url, init) => {
      sent.push(
        parse(
          audienceStageSchema,
          JSON.parse(stringValue(init.body, "stage body")),
        ),
      );
      return new Response(null, { status: 204 });
    },
  });
  const { studio, address } = await fixture({ poll, previewTunnel: tunnel });
  t.after(() => studio.server.close());
  const call = async (path: string, body: unknown) => {
    const r = await fetch(address.origin + "/api/" + path, {
      method: "POST",
      headers: {
        Origin: address.origin,
        Authorization: "Bearer " + address.deskToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    assert.equal(r.status, 200);
    return parseApiResponse("desk", await r.json());
  };
  await call("show-preview", { url: "http://localhost:8799/" });
  const local = parseApiResponse(
    "stage",
    await (
      await fetch(address.origin + "/api/stage", {
        headers: { Authorization: "Bearer " + address.stageToken },
      })
    ).json(),
  );
  assert.equal(local.demoUrl, "http://localhost:8799/");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.ok(sent.some((s) => s.demoUrl === "https://demo.trycloudflare.com/"));
  await call("back-material", {});
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(closed, true);
});
