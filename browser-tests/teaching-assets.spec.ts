import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { fixture } from "../tests/fixture.ts";
import { sections } from "../lib/material.ts";

test("packaged historical image and hypothesis summary work without remote archives", async ({
  audience,
  page,
}) => {
  const markdown = await readFile(
    "docs/presentations/web-development-2026.md",
    "utf8",
  );
  const path = "Lectures/Web Development 2026/Presentations/Assets.md";
  const local = await fixture({
    library: {
      status: "Fixture",
      list: async () => [{ path, label: "Assets" }],
      read: async () => sections(markdown),
      close: async () => {},
    },
  });
  try {
    for (const base of [local.address.origin, audience.url]) {
      const image = await fetch(
        new URL("/lecture-assets/mundaneum-drawers.jpg", base),
      );
      expect(image.status).toBe(200);
      expect(image.headers.get("content-type")).toContain("image/jpeg");
      const summary = await fetch(new URL("/hypotheses", base));
      expect(summary.status).toBe(200);
      expect(await summary.text()).toContain("hypotheses until evaluated");
    }
    const call = async (op: string, body: object) => {
      const response = await fetch(
        local.address.origin + "/api/presentation/" + op,
        {
          method: "POST",
          headers: {
            origin: local.address.origin,
            authorization: "Bearer " + local.address.deskToken,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      expect(response.status).toBe(200);
    };
    await call("load", { path });
    await call("select", { id: "vision-otlet" });
    await call("live", { live: true });
    await page.route("https://**/*", (route) => route.abort());
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(local.address.stageUrl);
    await expect(page.locator(".stage-copy img")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".stage-copy img")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/cached-otlet.png" });
    await call("select", { id: "vision-bush" });
    await call("show", {});
    await expect(page.locator(".stage-copy")).toContainText(
      "Memex was a proposal",
    );
  } finally {
    await local.stop();
  }
});
