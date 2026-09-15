import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";

test("failure experiment separates an unsent request from a lost post-write response", async ({
  page,
}) => {
  const local = await fixture();
  try {
    await page.goto(local.address.origin + "/teaching/failure");
    await page
      .getByRole("button", { name: "Submit with transport disabled" })
      .click();
    await page.getByRole("button", { name: "Read server record" }).click();
    await expect(page.locator("#server-evidence")).toHaveText(
      "Confirmed stored submissions: 0",
    );
    await page
      .getByRole("button", { name: "Submit and drop the response" })
      .click();
    await expect(page.locator("#browser-evidence")).toContainText(
      "Outcome unknown",
    );
    await page.getByRole("button", { name: "Read server record" }).click();
    await expect(page.locator("#server-evidence")).toHaveText(
      "Confirmed stored submissions: 1",
    );
    await page.getByRole("button", { name: "Reset experiment" }).click();
    await expect(page.locator("#server-evidence")).toHaveText(
      "Confirmed stored submissions: 0",
    );
  } finally {
    await local.stop();
  }
});
