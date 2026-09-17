import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  readdir,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { studySteps, exportStudy } from "../lib/study-export.ts";
import { parsePresentation, authoringMarkdown } from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";

test("study metadata round-trips, and the public allowlist omits private and classroom fields", async () => {
  const deck = parsePresentation(
    sections(await readFile("examples/demos/scalability-study.md", "utf8")),
  );
  assert.deepEqual(parsePresentation(sections(authoringMarkdown(deck))), deck);
  const result = studySteps(deck);
  const encoded = JSON.stringify(result);
  assert.equal(result.length, 3);
  assert.ok(!encoded.includes("PRIVATE_"));
  assert.ok(!encoded.includes("room"));
  assert.ok(!encoded.includes("defaultId"));
  assert.equal(result[2]?.activity?.correctOption, "bounded");
  deck.steps[0]!.type = "build";
  deck.steps[0]!.body = "PRIVATE_BUILD_PROMPT";
  assert.ok(!JSON.stringify(studySteps(deck)).includes("PRIVATE_BUILD_PROMPT"));
});

test("export creates portable modules and refuses destructive overwrites", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "study-export-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "published");
  const course = await exportStudy("examples/self-study/course.json", output);
  assert.equal(course.modules.length, 2);
  const module = await readFile(
    join(output, "scalability/module.json"),
    "utf8",
  );
  assert.ok(!module.includes("PRIVATE_"));
  assert.ok(!module.includes("/Users/"));
  const demo = await readFile(
    join(output, "scalability/demos/amdahl.html"),
    "utf8",
  );
  assert.match(demo, /LectureDemo/);
  assert.match(demo, /Content-Security-Policy/);
  assert.match(demo, /connect-src 'none'/);
  const html = await readFile(join(output, "scalability/index.html"), "utf8");
  assert.match(html, /\.\.\/assets\/study\.mjs/);
  assert.doesNotMatch(html, /src="\//);
  await assert.rejects(
    exportStudy("examples/self-study/course.json", output),
    /already exists/,
  );
  assert.equal(
    await readFile(join(output, "scalability/module.json"), "utf8"),
    module,
  );
  const second = await exportStudy(
    "examples/self-study/course.json",
    join(directory, "second"),
  );
  assert.equal(second.modules[0]?.revision, course.modules[0]?.revision);
});

test("export rejects symlinked demo escapes and does not leave partial output", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "study-boundary-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const external = join(
    tmpdir(),
    "study-external-" + crypto.randomUUID() + ".html",
  );
  await writeFile(external, "PRIVATE_EXTERNAL");
  t.after(() => rm(external));
  await symlink(external, join(directory, "demo.html"));
  await writeFile(
    join(directory, "deck.md"),
    "# Test\n## Presentation\n```yaml\nversion: 1\ntitle: Test\n```\n## Slide: Test\n```yaml\nid: test\ntype: material\ndemo: ./demo.html\n```",
  );
  await writeFile(
    join(directory, "course.json"),
    JSON.stringify({
      version: 1,
      id: "test",
      title: "Test",
      description: "Test",
      modules: [{ id: "test", source: "deck.md", description: "Test" }],
    }),
  );
  await assert.rejects(
    exportStudy(join(directory, "course.json"), join(directory, "output")),
    /inside the presentation/,
  );
  assert.ok(
    !(await readdir(directory)).some(
      (name) => name.startsWith(".study-export-") || name === "output",
    ),
  );
});
