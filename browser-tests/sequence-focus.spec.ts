import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { readFile } from "node:fs/promises";
import { sections } from "../lib/material.ts";

test("sequence reveals mute previous actions and retain the current action when revisited", async ({
  page,
}) => {
  const note = sections(
    await readFile(
      new URL("../docs/presentations/web-development-2026.md", import.meta.url),
      "utf8",
    ),
  );
  const path = "Lectures/Web Development 2026/Presentations/Test.md";
  const f = await fixture({
    library: {
      status: "Connected",
      list: async () => [{ path, label: "Test" }],
      read: async () => note,
      close: async () => {},
    },
  });
  try {
    const call = async (op: string, body = {}) => {
      const response = await page.request.post(
        new URL("/api/presentation/" + op, f.address.deskUrl).href,
        {
          headers: {
            Origin: new URL(f.address.deskUrl).origin,
            Authorization: "Bearer " + f.address.deskToken,
          },
          data: body,
        },
      );
      expect(response.ok()).toBe(true);
    };
    await call("load", { path });
    await call("select", { id: "flow-html-3" });
    await call("live", { live: true });
    await page.goto(f.address.stageUrl);
    const messages = page.locator(".messageText");
    await expect(messages).toHaveCount(5);
    await expect(messages.nth(0)).toHaveClass(/sequence-context/);
    await expect(messages.nth(4)).toHaveClass(/sequence-current/);
    await expect(messages.nth(4)).toContainText("HTML results fragment");
    await expect(messages.nth(0)).toHaveCSS("opacity", "0.65");
    await expect(page.locator(".noteText")).toHaveClass(/sequence-context/);
    await call("next");
    await expect(page.locator("h1")).toContainText("4/4 Update");
    await expect(page.locator(".noteText.sequence-current")).toContainText(
      "swaps the results region",
    );
    await expect(page.locator(".messageText.sequence-context")).toHaveCount(5);
    await call("previous");
    await expect(page.locator("h1")).toContainText("3/4 Respond");
    await expect(page.locator(".messageText.sequence-current")).toHaveText(
      "HTML results fragment",
    );
  } finally {
    await f.stop();
  }
});
