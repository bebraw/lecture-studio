import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const builds = [
  "build-document",
  "build-forms",
  "build-application",
  "build-agents",
];
const experience = ["new", "some", "regular"];
const topics = ["learning", "practical", "evaluation"];
const formats = ["talk", "demo", "discussion"];
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
interface ResponseRecord {
  experience: string;
  topics: string[];
  format: string;
  question: string;
}
export function preparedPreview(build: string, origin: string) {
  return builds.includes(build)
    ? origin + "/teaching/checkpoint/" + build
    : undefined;
}

// Isolated, volatile reference app: never the production poll or generated workspace.
export function preparedDemo() {
  const responses = new Map<string, ResponseRecord>();
  let revision = 0;
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    origin: string,
  ) => {
    const layers = /^\/teaching\/layers(?:\/(responses|results))?$/.exec(
      url.pathname,
    );
    const layerMode =
      layers && ["nojs", "html"].includes(url.searchParams.get("mode") || "")
        ? url.searchParams.get("mode")!
        : "full";
    const suffix = layers ? "?mode=" + layerMode : "";
    const match =
      /^\/teaching\/checkpoint\/(build-[a-z]+)(?:\/(responses|results))?$/.exec(
        layers
          ? "/teaching/checkpoint/build-application" +
              (layers[1] ? "/" + layers[1] : "")
          : url.pathname,
      );
    const build = match?.[1];
    if (!build || !builds.includes(build)) return false;
    res.setHeader("cache-control", "no-store");
    res.setHeader("referrer-policy", "same-origin");
    const base = layers ? "/teaching/layers" : "/teaching/checkpoint/" + build;
    if (layers)
      res.setHeader(
        "content-security-policy",
        `default-src 'self'; script-src ${layerMode === "full" ? "'self'" : "'none'"}; style-src ${layerMode === "html" ? "'none'" : "'self'"}; form-action 'self'; frame-ancestors 'self'`,
      );
    let voter = req.headers.cookie?.match(
      /(?:^|;\s*)teaching_browser=([a-f0-9-]{36})(?:;|$)/,
    )?.[1];
    if (!voter) {
      voter = randomUUID();
      res.setHeader(
        "set-cookie",
        `teaching_browser=${voter}; Path=/teaching/; HttpOnly; SameSite=Strict`,
      );
    }
    let values = responses.get(voter) ?? {
      experience: "",
      topics: [],
      format: "",
      question: "",
    };
    let error = "";
    if (req.method === "POST") {
      if (req.headers.origin !== origin || match?.[2] !== "responses") {
        res.writeHead(403);
        res.end("Same-origin submission required");
        return true;
      }
      if (
        !req.headers["content-type"]?.startsWith(
          "application/x-www-form-urlencoded",
        )
      ) {
        res.writeHead(415);
        res.end("Expected form submission");
        return true;
      }
      let body = "";
      for await (const chunk of req) {
        body += String(chunk);
        if (Buffer.byteLength(body) > 4096) {
          res.writeHead(413);
          res.end("Form too large");
          return true;
        }
      }
      const form = new URLSearchParams(body);
      values = {
        experience: form.get("experience") || "",
        topics: [...new Set(form.getAll("topic"))],
        format: form.get("format") || "",
        question: form.get("question") || "",
      };
      if (
        !experience.includes(values.experience) ||
        !values.topics.length ||
        values.topics.some((t) => !topics.includes(t)) ||
        !formats.includes(values.format) ||
        values.question.length > 200
      )
        error =
          "Choose experience, at least one listed topic and a format. Keep the question within 200 characters.";
      else if (!responses.has(voter) && responses.size >= 1000)
        error =
          "Prepared demo is full; restart the studio to clear its volatile records.";
      else {
        responses.set(voter, values);
        revision++;
        res.writeHead(303, { location: base + "/results" + suffix });
        res.end();
        return true;
      }
    } else if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return true;
    }
    const banner = layers
      ? `<nav aria-label="Enhancement layers"><a href="${base}?mode=full">Full: HTML + CSS + JavaScript</a> · <a href="${base}?mode=nojs">No JavaScript</a> · <a href="${base}?mode=html">HTML only</a></nav><h1>Remove the outer layers</h1><p><strong>Prepared teaching experiment · ${layerMode === "full" ? "all layers enabled" : layerMode === "nojs" ? "JavaScript blocked in this app" : "CSS and JavaScript blocked in this app"}</strong></p><p>These controls affect this app only. Submit a response and compare the confirmation and results. This is an isolated reference, not the generated build.</p>`
      : "<p><strong>Prepared reference · live build preview unavailable</strong></p><p>This isolated example is not evidence that the live build succeeded. Records are in memory and disappear when the studio restarts. Do not enter personal information.</p>";
    if (build === "build-document") {
      const html = await readFile(
        new URL("../document-a/index.html", import.meta.url),
        "utf8",
      );
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        html
          .replace('href="style.css"', 'href="/prepared-document.css"')
          .replace("<body>", "<body>" + banner),
      );
      return true;
    }
    const rows = [...responses.values()];
    const counts = (
      labels: string[],
      selected: (row: ResponseRecord) => string[],
    ) =>
      labels
        .map(
          (label) =>
            `<li>${escape(label)}: ${rows.filter((row) => selected(row).includes(label)).length}</li>`,
        )
        .join("");
    const aggregate = `<section id="prepared-aggregate"><h2>Shared results</h2><p>Respondents: ${rows.length} · Revision: ${revision}</p><h3>Experience</h3><ul>${counts(experience, (r) => [r.experience])}</ul><h3>Topics</h3><ul>${counts(topics, (r) => r.topics)}</ul><h3>Format</h3><ul>${counts(formats, (r) => [r.format])}</ul></section>`;
    const confirmation =
      match?.[2] === "results" && responses.has(voter)
        ? `<p role="status">Confirmed: ${escape(values.experience)}; ${values.topics.map(escape).join(", ")}; ${escape(values.format)}. A repeat submission replaces this browser’s response.</p>`
        : "";
    const form = `<form id="prepared-form" action="${base}/responses" method="post"><h2>Seminar interests</h2><p role="alert">${escape(error)}</p><label for="prepared-experience">Experience</label><select id="prepared-experience" name="experience" required><option value="">Choose</option>${experience.map((v) => `<option${values.experience === v ? " selected" : ""}>${v}</option>`).join("")}</select><fieldset><legend>Topics · choose at least one</legend>${topics.map((v) => `<label><input name="topic" type="checkbox" value="${v}"${values.topics.includes(v) ? " checked" : ""}> ${v}</label>`).join("")}</fieldset><fieldset><legend>Session format</legend>${formats.map((v) => `<label><input name="format" type="radio" value="${v}" required${values.format === v ? " checked" : ""}> ${v}</label>`).join("")}</fieldset><label>Optional question · no personal details <textarea name="question" maxlength="200">${escape(values.question)}</textarea></label><p>Questions are kept only in this browser’s private server record; they are excluded from shared counts and composition.</p><button>Submit response</button><p id="prepared-status" role="status"></p></form>`;
    const composition = `<section><h2>Runtime model unavailable: fixed fallback</h2><p>No runtime model was called for this prepared view. Use the live build to assess generated claims. This fallback preserves access to verified counts and the existing form.</p><h3>Context receipt</h3><p>Source: predefined seminar-interest counts at revision ${revision}. Excluded: questions and browser identifiers. Destination: this local deterministic renderer. Permitted action: submit or replace this browser’s response. No booking authority.</p></section>`;
    res.writeHead(error ? 400 : 200, {
      "content-type": "text/html; charset=utf-8",
    });
    res.end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prepared seminar checkpoint</title>${layerMode !== "html" ? '<link rel="stylesheet" href="/prepared-document.css">' : ""}${build === "build-application" && layerMode === "full" ? '<script type="module" src="/prepared-demo.mjs"></script>' : ""}</head><body><main class="page">${banner}${confirmation}${build === "build-agents" ? composition : ""}${form.replace('action="' + base + '/responses"', 'action="' + base + "/responses" + suffix + '"')}${aggregate}</main></body></html>`,
    );
    return true;
  };
}
