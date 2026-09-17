import {
  imageSources,
  loadPresentationImages,
  posterMarkdown,
} from "./presentation-images.ts";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  realpath,
  mkdtemp,
  rename,
  rm,
  access,
  copyFile,
} from "node:fs/promises";
import { dirname, resolve, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as v from "valibot";
import { parsePresentation } from "./presentation.ts";
import { renderMarkdown, sections } from "./material.ts";
import { demoDocument } from "./web-demos.ts";
import type { PresentationDefinition } from "../shared/models.ts";
import type { StudyModule, StudyStep, StudyCourse } from "../shared/study.ts";

const slug = v.pipe(v.string(), v.regex(/^[a-z0-9][a-z0-9-]{0,59}$/));
const configSchema = v.strictObject({
  version: v.literal(1),
  id: slug,
  title: v.string(),
  description: v.string(),
  modules: v.pipe(
    v.array(
      v.strictObject({
        id: slug,
        source: v.string(),
        title: v.exactOptional(v.string()),
        description: v.string(),
      }),
    ),
    v.minLength(1),
    v.maxLength(100),
  ),
});
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 20);
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
export function studySteps(deck: PresentationDefinition): StudyStep[] {
  return deck.steps
    .filter((step) => !step.study?.exclude)
    .map((step) => {
      const activity =
        step.type === "poll" ||
        step.type === "question" ||
        step.wordCloud ||
        step.study?.prompt !== undefined;
      // Explicit public allowlist. Never spread a Step or serialize the source deck.
      return {
        id: step.id,
        title: step.title,
        chapter: step.chapter || "",
        source: step.source || "",
        html: renderMarkdown(
          step.type === "build"
            ? "This classroom build is not included. Use the explanation or reading references below."
            : (step.body || "") + posterMarkdown(step),
          {
            allowRemoteImages: step.allowRemoteImages === true,
            imageSources: imageSources(step),
          },
        ),
        explanationHtml: renderMarkdown(step.study?.explanation || "", {
          imageSources: imageSources(step),
        }),
        ...(activity
          ? {
              activity: {
                promptHtml: renderMarkdown(
                  step.study?.prompt ||
                    "Consider your answer before revealing the discussion.",
                  { imageSources: imageSources(step) },
                ),
                answerHtml: renderMarkdown(step.study?.answer || "", {
                  imageSources: imageSources(step),
                }),
                options:
                  step.poll?.options.map(({ id, label }) => ({ id, label })) ||
                  [],
                ...(step.study?.correctOption !== undefined
                  ? { correctOption: step.study.correctOption }
                  : {}),
              },
            }
          : {}),
      };
    });
}
const page = (
  title: string,
  assets: string,
  content: string,
  dataFile: string,
  kind: string,
) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Self-study</title><link rel="stylesheet" href="${assets}/study.css"></head><body data-study-kind="${kind}" data-study-data="${dataFile}"><a class="skip" href="#main">Skip to content</a>${content}<script type="module" src="${assets}/study.mjs"></script></body></html>`;
export function modulePage(module: StudyModule) {
  const slides = module.steps
    .map(
      (step, i) =>
        `<section class="study-step" id="slide-${step.id}" tabindex="-1"><p class="eyebrow">${escape(step.chapter || "Explore")} / ${String(i + 1).padStart(2, "0")}</p><h2>${escape(step.title)}</h2><div class="prose">${step.html}</div>${step.demo ? `<div class="demo-host" data-demo="${step.id}"></div><button class="reset-demo" type="button" data-reset-demo="${step.id}" hidden>Reset experiment</button><noscript><p>Enable JavaScript to explore this demonstration.</p></noscript>` : ""}${step.explanationHtml ? `<details class="explanation"><summary>Read the explanation</summary><div class="prose">${step.explanationHtml}</div></details>` : ""}${step.activity ? `<div class="activity"><p class="eyebrow">${step.activity.correctOption ? "Check your understanding" : "Pause and reflect"}</p><div class="prose">${step.activity.promptHtml}</div>${step.activity.options.length ? `<fieldset><legend>Your choice</legend>${step.activity.options.map((option) => `<label><input type="radio" name="choice-${step.id}" value="${escape(option.id)}"> ${escape(option.label)}</label>`).join("")}</fieldset>` : ""}${step.activity.correctOption ? '<button class="check-answer" type="button" hidden>Check answer</button><p class="answer-result" role="status"></p>' : ""}${step.activity.answerHtml ? `<details><summary>Reveal discussion</summary><div class="prose">${step.activity.answerHtml}</div></details>` : ""}</div>` : ""}${step.source ? `<p class="source">${escape(step.source)}</p>` : ""}<button class="complete-step" type="button" hidden>Mark as complete</button></section>`,
    )
    .join("\n");
  return page(
    module.title,
    "../assets",
    `<header class="masthead"><a href="../index.html">← All modules</a><span>Independent study</span></header><div class="study-layout"><aside><p class="eyebrow">Your route</p><h1>${escape(module.title)}</h1><p>${escape(module.description)}</p><p id="study-progress" role="status"></p><nav aria-label="Module sections">${module.steps.map((step, i) => `<a href="#slide-${step.id}" data-step-link="${step.id}"><span>${String(i + 1).padStart(2, "0")}</span>${escape(step.title)}</a>`).join("")}</nav><p class="local-note">Progress stays in this browser.</p><button id="reset-progress" type="button" hidden>Reset module progress</button></aside><main id="main">${slides}<nav class="step-navigation" aria-label="Step navigation" hidden><button id="study-previous" type="button">← Previous</button><a href="../index.html" id="module-end" hidden>Back to modules →</a><button id="study-next" type="button">Next →</button></nav></main></div><footer class="study-footer"><p id="storage-status" role="status"></p><p>No class session required. <button id="reading-mode" type="button" hidden>Show all sections</button></p></footer>`,
    "./module.json",
    "module",
  );
}
function coursePage(course: StudyCourse) {
  return page(
    course.title,
    "./assets",
    `<header class="masthead"><span>Learning collection</span><span>Read / experiment / reflect</span></header><main id="main" class="course-home"><p class="eyebrow">At your own pace</p><h1>${escape(course.title)}</h1><p class="lede">${escape(course.description)}</p><ol class="module-list">${course.modules.map((module, i) => `<li><span class="module-number">${String(i + 1).padStart(2, "0")}</span><div><h2><a href="${module.href}">${escape(module.title)}</a></h2><p>${escape(module.description)}</p><span class="module-progress" data-module="${module.id}">${module.steps} sections</span></div><a class="module-start" href="${module.href}" aria-label="Start ${escape(module.title)}">Explore →</a></li>`).join("")}</ol><p class="local-note">No account required. Your progress and experiments stay in this browser.</p><p id="storage-status" role="status"></p></main>`,
    "./course.json",
    "course",
  );
}
async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
export async function exportStudy(configPath: string, outputPath: string) {
  const config = v.parse(
    configSchema,
    JSON.parse(await readFile(configPath, "utf8")),
  );
  if (
    new Set(config.modules.map((module) => module.id)).size !==
    config.modules.length
  )
    throw new Error("Module IDs must be unique");
  const output = resolve(outputPath);
  if (await exists(output))
    throw new Error(
      "Output already exists. Choose a new directory for this reviewed export: " +
        output,
    );
  await mkdir(dirname(output), { recursive: true });
  const temporary = await mkdtemp(join(dirname(output), ".study-export-"));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const course: StudyCourse = {
    format: "lecture-studio-study-course",
    version: 1,
    id: config.id,
    title: config.title,
    description: config.description,
    modules: [],
  };
  try {
    for (const entry of config.modules) {
      const source = await realpath(resolve(dirname(configPath), entry.source));
      const deck = parsePresentation(sections(await readFile(source, "utf8")));
      await loadPresentationImages(
        { ...deck, steps: deck.steps.filter((step) => !step.study?.exclude) },
        async (image) => {
          const path = await realpath(resolve(dirname(source), image));
          if (!path.startsWith(dirname(source) + sep))
            throw new Error(
              "Image must stay inside the presentation directory",
            );
          return readFile(path);
        },
      );
      const steps = studySteps(deck);
      if (!steps.length)
        throw new Error("No public sections in module " + entry.id);
      const folder = join(temporary, entry.id);
      await mkdir(join(folder, "demos"), { recursive: true });
      for (const step of steps) {
        const original = deck.steps.find(
          (candidate) => candidate.id === step.id,
        )!;
        if (!original.demo) continue;
        if (
          original.type !== "material" ||
          original.previewOf ||
          original.teachingDemo ||
          original.layersDemo
        )
          throw new Error(
            "Use demo on a material slide without another demo setting",
          );
        const path = await realpath(resolve(dirname(source), original.demo));
        const rel = relative(dirname(source), path);
        if (
          rel.startsWith(".." + sep) ||
          rel === ".." ||
          resolve(dirname(source), rel) !== path
        )
          throw new Error("Demo must stay inside the presentation directory");
        const html = await readFile(path, "utf8");
        if (Buffer.byteLength(html) > 250000)
          throw new Error("Demo exceeds 250 KB");
        const url = "./demos/" + step.id + ".html";
        const sandboxed = demoDocument(html, true).replace(
          "<meta charset=utf-8>",
          `<meta charset=utf-8><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">`,
        );
        await writeFile(join(folder, url), sandboxed);
        step.demo = { url, revision: hash(html) };
      }
      // Existing packaged lecture images are the only local image paths emitted by renderMarkdown.
      for (const step of steps) {
        for (const html of [
          step.html,
          step.explanationHtml,
          step.activity?.promptHtml || "",
          step.activity?.answerHtml || "",
        ]) {
          for (const match of html.matchAll(
            /src="(\/lecture-assets\/[a-zA-Z0-9._/-]+)"/g,
          )) {
            const asset = match[1]!;
            const from = await realpath(join(root, "public", asset));
            if (!from.startsWith(join(root, "public", "lecture-assets") + sep))
              throw new Error("Invalid lecture asset");
            await mkdir(dirname(join(temporary, "assets", asset)), {
              recursive: true,
            });
            await copyFile(from, join(temporary, "assets", asset));
          }
        }
        step.html = step.html.replaceAll(
          'src="/lecture-assets/',
          'src="../assets/lecture-assets/',
        );
        step.explanationHtml = step.explanationHtml.replaceAll(
          'src="/lecture-assets/',
          'src="../assets/lecture-assets/',
        );
        if (step.activity) {
          step.activity.promptHtml = step.activity.promptHtml.replaceAll(
            'src="/lecture-assets/',
            'src="../assets/lecture-assets/',
          );
          step.activity.answerHtml = step.activity.answerHtml.replaceAll(
            'src="/lecture-assets/',
            'src="../assets/lecture-assets/',
          );
        }
      }
      const module: StudyModule = {
        format: "lecture-studio-study-module",
        version: 1,
        courseId: config.id,
        id: entry.id,
        title: entry.title || deck.title,
        description: entry.description,
        revision: "",
        steps,
      };
      module.revision = hash(json(module));
      await writeFile(join(folder, "module.json"), json(module));
      await writeFile(join(folder, "index.html"), modulePage(module));
      course.modules.push({
        id: module.id,
        title: module.title,
        description: module.description,
        href: `./${entry.id}/index.html`,
        data: `./${entry.id}/module.json`,
        revision: module.revision,
        steps: steps.length,
      });
    }
    await mkdir(join(temporary, "assets"), { recursive: true });
    await build({
      entryPoints: [join(root, "public/study.ts")],
      outdir: join(temporary, "assets"),
      bundle: true,
      splitting: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      minify: true,
      outExtension: { ".js": ".mjs" },
    });
    await copyFile(
      join(root, "public/study.css"),
      join(temporary, "assets/study.css"),
    );
    await writeFile(join(temporary, "course.json"), json(course));
    await writeFile(join(temporary, "index.html"), coursePage(course));
    await rename(temporary, output);
    return course;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}
