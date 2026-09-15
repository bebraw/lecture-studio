import { test, expect } from "@playwright/test";
import { renderMarkdown } from "../lib/material.ts";

test("onion diagram nests three layers and treats labels as text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(
    renderMarkdown(
      "```onion\nHTML | Read and submit\nCSS | Presentation\nJavaScript | Interaction\n```",
    ),
  );
  await expect(
    page.getByRole("img", { name: "HTML inside CSS inside JavaScript" }),
  ).toBeVisible();
  await expect(page.locator("circle")).toHaveCount(3);
  await page.screenshot({ path: ".local/onion.png" });
  await page.setContent(
    renderMarkdown(
      "```onion\n<script>bad()</script> | <img src=x onerror=bad()>\nCSS | Presentation\nJavaScript | Interaction\n```",
    ),
  );
  await expect(page.locator("script, img")).toHaveCount(0);
  await expect(page.locator("svg")).toContainText("<script>bad()</script>");
});
