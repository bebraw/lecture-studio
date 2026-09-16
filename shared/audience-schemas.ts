import * as v from "valibot";
import { stageSchema } from "./schemas.ts";

// Public publishers may omit the local studio's optional presentation fields.
export const audienceStageSchema = v.object({
  ...stageSchema.entries,
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
