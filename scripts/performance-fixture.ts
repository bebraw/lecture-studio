import { fixture } from "../tests/fixture.ts";
import { audienceFixture } from "../audience/performance-fixture.ts";
import { initialDraft } from "../lib/narrative.ts";
import { publicStage } from "../lib/material.ts";

export async function performanceFixture() {
  const local = await fixture();
  const draft = {
    ...initialDraft(),
    mode: "material",
    title: "One capability, three interfaces",
    body: "## Keep the capability\n\nA document gives information an address. A form lets people act. Enhancement improves feedback while preserving the native path.\n\n- Read and link\n- Submit a choice\n- Share the result",
  };
  try {
    const response = await fetch(local.address.origin + "/api/publish", {
      method: "POST",
      headers: {
        origin: local.address.origin,
        authorization: "Bearer " + local.address.deskToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    if (!response.ok)
      throw new Error(`Stage fixture publication failed: ${response.status}`);
    const audience = await audienceFixture(publicStage(draft, 1));
    return {
      stage: local.address.stageUrl,
      audience: audience.url,
      async stop() {
        await Promise.all([
          audience.stop(),
          local.studio.server[Symbol.asyncDispose](),
        ]);
      },
    };
  } catch (error) {
    await local.studio.server[Symbol.asyncDispose]();
    throw error;
  }
}
