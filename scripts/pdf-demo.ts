import type { Browser } from "@playwright/test";
import type { PresentationDefinition } from "../shared/models.ts";
import { demoDocument } from "../shared/demo-document.ts";

export async function captureDemoFrames(
  browser: Browser,
  deck: PresentationDefinition,
  read: (path: string) => Promise<Buffer>,
) {
  const frames: Record<string, string[]> = {};
  for (const step of deck.steps) {
    if (!step.demoSequence?.some((frame) => "state" in frame)) continue;
    const source = await read(step.demo!);
    if (source.length > 250000)
      throw new Error(`Slide ${step.id}: demo exceeds 250 KB`);
    frames[step.id] = [];
    for (const [index, frame] of step.demoSequence.entries()) {
      if (!("state" in frame)) continue;
      const page = await browser.newPage({
        viewport: { width: 1200, height: 600 },
        deviceScaleFactor: 2,
        serviceWorkers: "block",
      });
      try {
        await page.route("**/*", (route) => route.abort());
        await page.clock.setFixedTime(new Date("2000-01-01T00:00:00Z"));
        await page.addInitScript(() => {
          let seed = 1;
          Math.random = () =>
            ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        });
        await page.setContent(
          '<!doctype html><html><body style="margin:0"></body></html>',
        );
        await page.evaluate(
          ({ html, state }) =>
            new Promise<void>((resolve, reject) => {
              const iframe = document.createElement("iframe");
              iframe.setAttribute("sandbox", "allow-scripts");
              iframe.style.cssText =
                "width:1200px;height:600px;border:0;display:block";
              const timer = setTimeout(() => {
                reject(
                  new Error(
                    "Demo did not acknowledge rendering within 10 seconds; return a resolving promise from LectureDemo.onState",
                  ),
                );
              }, 10000);
              window.addEventListener("message", (event) => {
                if (event.source !== iframe.contentWindow) return;
                const message: unknown = event.data;
                if (
                  !message ||
                  typeof message !== "object" ||
                  !("type" in message)
                )
                  return;
                if (message.type === "lecture-demo:error") {
                  clearTimeout(timer);
                  reject(new Error("Demo reported a rendering error"));
                }
                if (message.type === "lecture-demo:ready")
                  iframe.contentWindow!.postMessage(
                    { type: "lecture-demo:state", state },
                    "*",
                  );
                if (message.type === "lecture-demo:rendered") {
                  clearTimeout(timer);
                  resolve();
                }
              });
              iframe.srcdoc = html;
              document.body.append(iframe);
            }),
          {
            html: demoDocument(source.toString("utf8"), false),
            state: frame.state,
          },
        );
        const content = page
          .frames()
          .find((candidate) => candidate !== page.mainFrame())!;
        await content.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((image) => image.decode()),
          );
          const style = document.createElement("style");
          style.textContent =
            "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
          document.head.append(style);
          if (
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight
          )
            throw new Error("Demo overflows its 1200 × 600 export viewport");
        });
        frames[step.id]![index] =
          "data:image/png;base64," +
          (
            await page.locator("iframe").screenshot({ animations: "disabled" })
          ).toString("base64");
      } catch (error) {
        throw new Error(
          `Slide ${step.id}, frame ${index + 1} (${frame.caption}): ${String(error)}`,
        );
      } finally {
        await page.close();
      }
    }
  }
  return frames;
}
