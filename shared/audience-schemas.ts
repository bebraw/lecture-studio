import * as v from "valibot";
import { validateDemoState } from "./web-demo.ts";
import { stageSchema } from "./schemas.ts";

export const publicDemoSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^[a-f0-9-]{36}$/)),
  url: v.pipe(v.string(), v.regex(/^\/audience-demo\/[a-f0-9-]{36}$/)),
  state: v.pipe(
    v.string(),
    v.check((value) => {
      try {
        validateDemoState(value);
        return true;
      } catch {
        return false;
      }
    }),
  ),
});
// Public publishers may omit the local studio's optional presentation fields.
export const audienceStageSchema = v.object({
  ...stageSchema.entries,
  webDemo: v.exactOptional(publicDemoSchema),
  act: v.optional(v.string(), ""),
  mode: v.optional(v.string(), "material"),
  source: v.optional(v.string(), ""),
  diagram: v.optional(v.string(), ""),
  demoUrl: v.optional(v.string(), ""),
  version: v.optional(v.union([v.string(), v.number()]), 0),
});
export const audienceResponseSchema = v.object({
  active: v.exactOptional(v.number()),
  stage: v.nullable(audienceStageSchema),
  poll: v.nullable(
    v.object({ id: v.string(), question: v.string(), html: v.string() }),
  ),
});
export const publicFeedbackSchema = v.nullable(
  v.object({
    round: v.string(),
    mode: v.string(),
    prompt: v.string(),
    open: v.boolean(),
  }),
);

export const audiencePublicationSchema = v.object({
  ...audienceStageSchema.entries,
  demoHtml: v.exactOptional(
    v.pipe(
      v.string(),
      v.check((value) => new TextEncoder().encode(value).length <= 250000),
    ),
  ),
});
