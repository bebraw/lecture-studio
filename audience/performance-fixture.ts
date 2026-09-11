import type { Stage } from "../shared/models.ts";
import { workerFixture } from "./worker-fixture.ts";

export async function audienceFixture(stage: Stage) {
  const worker = await workerFixture();
  try {
    await worker.admin("/presenter/stage", { ...stage, live: true });
    return { url: worker.url, stop: worker.stop };
  } catch (error) {
    await worker.stop();
    throw error;
  }
}
