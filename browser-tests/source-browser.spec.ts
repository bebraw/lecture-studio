import { test, expect } from "@playwright/test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixture } from "../tests/fixture.ts";

test("source stays private until selected, rejects stale review and returns to the lecture", async ({
  page,
  browser,
}) => {
  const workspace = await mkdtemp(join(tmpdir(), "lecture-source-ui-"));
  await writeFile(
    join(workspace, "app.ts"),
    "const message = '<script>bad()</script>';\nexport default message;\n// PRIVATE UNSELECTED LINE",
  );
  const local = await fixture({ workspace });
  const stage = await browser.newPage();
  try {
    await page.goto(local.address.deskUrl);
    await stage.goto(local.address.stageUrl);
    const original = await stage.locator("h1").textContent();
    await page.locator("#inspect-source").click();
    await expect(page.locator(".source-code")).toContainText(
      "PRIVATE UNSELECTED LINE",
    );
    await expect(stage.locator("body")).not.toContainText(
      "PRIVATE UNSELECTED LINE",
    );
    const unauthorized = await fetch(
      local.address.origin + "/api/source/files",
      { headers: { authorization: "Bearer " + local.address.stageToken } },
    );
    expect(unauthorized.status).toBe(401);
    // Original-lecture publishing activates Live, with no build or app mutation.
    const headers = {
      origin: local.address.origin,
      authorization: "Bearer " + local.address.deskToken,
      "content-type": "application/json",
    };
    const published = await fetch(local.address.origin + "/api/publish-brief", {
      method: "POST",
      headers,
      body: JSON.stringify({ brief: "Lecture discussion" }),
    });
    expect(published.status).toBe(200);
    await expect(stage.locator("h1")).not.toHaveText(original || "");
    const before = await stage.locator("h1").textContent();
    await page.locator("[data-end]").fill("1");
    await writeFile(
      join(workspace, "app.ts"),
      "const message = 'Updated';\nexport default message;\n// PRIVATE UNSELECTED LINE",
    );
    await page.locator("[data-show]").click();
    await expect(page.locator('.source-browser [role="status"]')).toContainText(
      "changed",
    );
    await page.locator("[data-reload]").click();
    await expect(page.locator(".source-code")).toContainText("Updated");
    await page.locator("[data-end]").fill("1");
    await page.locator("[data-show]").click();
    await expect(stage.locator("h1")).toHaveText("app.ts");
    await expect(stage.locator("#stage-content")).toContainText("Updated");
    await expect(stage.locator("#stage-content")).not.toContainText(
      "PRIVATE UNSELECTED LINE",
    );
    await page.screenshot({ path: "test-results/source-browser.png" });
    await page.locator("[data-return]").click();
    await expect(stage.locator("h1")).toHaveText(before || "");
    await expect(page.locator("#inspect-source")).toBeFocused();
  } finally {
    await local.stop();
    await rm(workspace, { recursive: true, force: true });
  }
});
