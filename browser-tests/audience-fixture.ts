import { test as base } from "@playwright/test";
import { workerFixture } from "../audience/worker-fixture.ts";

export const rooms = [
  "webdev-2026-friction",
  "webdev-2026",
  "webdev-2026-priority",
] as const;

export const test = base.extend<{
  audience: Awaited<ReturnType<typeof workerFixture>>;
}>({
  audience: [
    // Playwright requires destructuring to discover fixture dependencies.
    // oxlint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const worker = await workerFixture();
      try {
        for (const room of rooms) {
          await worker.admin(`/presenter/rooms/${room}/seed`);
          await worker.admin(`/presenter/rooms/${room}/lock`);
        }
        await use(worker);
      } finally {
        await worker.stop();
      }
    },
    { timeout: 60000 },
  ],
});
