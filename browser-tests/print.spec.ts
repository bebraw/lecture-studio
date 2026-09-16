import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";

test("the complete reading copy renders a printable PDF without horizontal clipping", async ({
  page,
}, testInfo) => {
  const { address, stop } = await fixture();
  try {
    await page.route("https://**/*", (route) => route.abort());
    await page.goto(address.origin + "/slides");
    await expect(page.locator("#print-slides")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await page.setViewportSize({ width: 658, height: 1000 });
    await expect(page.locator("#print-slides")).toBeHidden();
    expect(await page.locator(".slide").count()).toBeGreaterThan(50);
    const clipped = await page
      .locator(".slide")
      .evaluateAll((slides) =>
        slides
          .filter((slide) => slide.scrollWidth > slide.clientWidth + 1)
          .map((slide) => slide.id),
      );
    expect(clipped).toEqual([]);
    const pdf = testInfo.outputPath("lecture-reading-copy.pdf");
    await page.pdf({
      path: pdf,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:9px;width:100%;text-align:center;color:#555">Lecture reading copy · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    await testInfo.attach("Printed lecture", {
      path: pdf,
      contentType: "application/pdf",
    });
  } finally {
    await stop();
  }
});
