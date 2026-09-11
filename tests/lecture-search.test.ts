import test from "node:test";
import assert from "node:assert/strict";
import { LectureSearch } from "../lib/lecture-search.ts";
import { fixture } from "./fixture.ts";
test("lecture search matches section bodies, shares its index and reports missing notes", async () => {
  let reads = 0;
  const search = new LectureSearch({
    list: async () => [
      { path: "one", label: "One" },
      { path: "missing", label: "Missing" },
    ],
    read: async (path) => {
      reads++;
      if (path === "missing") throw Error("offline");
      return {
        path,
        title: "Early web",
        sections: [
          {
            heading: "Mechanism",
            body: "A browser sends HTTP requests to a server.",
          },
        ],
      };
    },
  });
  const [a, b] = await Promise.all([
    search.search("server"),
    search.search("HTTP browser"),
  ]);
  assert.equal(a.matches[0]?.section, "Mechanism");
  assert.equal(b.matches.length, 1);
  assert.equal(a.unavailable, 1);
  assert.equal(reads, 2);
  await search.search("server");
  assert.equal(reads, 2);
  search.clear();
  await search.search("server");
  assert.equal(reads, 4);
  await assert.rejects(() => search.search("x"));
});
test("search is private and never changes the projected stage", async (t) => {
  const { studio, address } = await fixture();
  t.after(() => studio.server.close());
  const get = async (path: string, token: string) =>
    fetch(address.origin + "/api/" + path, {
      headers: { Authorization: "Bearer " + token },
    });
  const before = await (await get("stage", address.stageToken)).json();
  assert.equal((await get("search?q=private", address.stageToken)).status, 401);
  const result = await (
    await get("search?q=private", address.deskToken)
  ).json();
  assert.equal(result.matches[0].section, "Presenter");
  const after = await (await get("stage", address.stageToken)).json();
  assert.deepEqual(after, before);
});
