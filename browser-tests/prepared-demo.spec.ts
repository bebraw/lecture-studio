import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";

test("layer controls isolate scripts and styles while native submission survives", async ({
  page,
}) => {
  const local = await fixture();
  try {
    await page.goto(local.address.origin + "/teaching/layers");
    await page.getByLabel("Experience", { exact: true }).selectOption("some");
    await page.getByLabel("learning", { exact: true }).check();
    await page.getByLabel("talk", { exact: true }).check();
    await page.getByRole("button", { name: "Submit response" }).click();
    await expect(page.locator("#prepared-status")).toHaveText(
      "Confirmed by the server.",
    );
    for (const [label, mode] of [
      ["No JavaScript", "nojs"],
      ["HTML only", "html"],
    ] as const) {
      const response = page.waitForResponse((r) =>
        r.request().isNavigationRequest(),
      );
      await page.getByRole("link", { name: label, exact: true }).click();
      expect((await response).headers()["content-security-policy"]).toContain(
        "script-src 'none'",
      );
      await expect(page.locator("script")).toHaveCount(0);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(
        mode === "html" ? 0 : 1,
      );
      await page.getByRole("button", { name: "Submit response" }).click();
      await expect(page).toHaveURL(new RegExp(`/results\\?mode=${mode}$`));
      await expect(
        page.getByText("Confirmed: some; learning; talk.", { exact: false }),
      ).toBeVisible();
      await expect(page.locator("#prepared-aggregate")).toContainText(
        "Respondents: 1",
      );
    }
    await page.goto(local.address.deskUrl);
    await page.locator("#presentation-name").click();
    await expect(page.locator("#presentation-name")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  } finally {
    await local.stop();
  }
});

test("prepared checkpoints support native replacement, shared updates and an honest composition fallback", async ({
  browser,
  page,
}) => {
  const local = await fixture();
  const native = await browser.newContext({ javaScriptEnabled: false });
  try {
    const document = await native.newPage();
    const base = local.address.origin + "/teaching/checkpoint/";
    await document.goto(base + "build-document");
    await expect(
      document.getByText(
        "Prepared reference · live build preview unavailable",
        { exact: true },
      ),
    ).toBeVisible();
    await document.goto(base + "build-forms");
    await document
      .getByLabel("Experience", { exact: true })
      .selectOption("new");
    await document.getByLabel("talk", { exact: true }).check();
    await document.getByRole("button", { name: "Submit response" }).click();
    await expect(document.getByRole("alert")).toContainText(
      "at least one listed topic",
    );
    await expect(
      document.getByLabel("Experience", { exact: true }),
    ).toHaveValue("new");
    await document.getByLabel("learning", { exact: true }).check();
    await document.getByRole("button", { name: "Submit response" }).click();
    await expect(document).toHaveURL(/\/results$/);
    await expect(document.locator("#prepared-aggregate")).toContainText(
      "Respondents: 1",
    );
    await document
      .getByLabel("Experience", { exact: true })
      .selectOption("regular");
    await document.getByRole("button", { name: "Submit response" }).click();
    await expect(document.locator("#prepared-aggregate")).toContainText(
      "Respondents: 1",
    );
    await page.goto(base + "build-application");
    await page.getByLabel("Experience", { exact: true }).selectOption("some");
    await document
      .getByLabel("Experience", { exact: true })
      .selectOption("new");
    await document.getByRole("button", { name: "Submit response" }).click();
    await expect(page.locator("#prepared-aggregate")).toContainText(
      "Revision: 3",
    );
    await expect(page.getByLabel("Experience", { exact: true })).toHaveValue(
      "some",
    );
    await page.goto(base + "build-agents");
    await expect(
      page.getByRole("heading", {
        name: "Runtime model unavailable: fixed fallback",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Context receipt" }),
    ).toBeVisible();
  } finally {
    await native.close();
    await local.stop();
  }
});
