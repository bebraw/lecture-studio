import * as v from "valibot";
import { publicFeedbackSchema } from "./audience-schemas.ts";
import { feedbackSchema } from "./schemas.ts";
export const qaPublicSchema = v.object({
  title: v.string(),
  config: publicFeedbackSchema,
});
export const qaPrivateSchema = v.object({
  title: v.string(),
  feedback: feedbackSchema,
});
export const qaActionSchema = v.strictObject({
  action: v.picklist([
    "open",
    "close",
    "shortlist",
    "pending",
    "answered",
    "reply-later",
    "dismissed",
  ]),
  id: v.exactOptional(v.pipe(v.string(), v.maxLength(100))),
});
export const qaSetupSchema = v.strictObject({
  action: v.picklist(["create", "rotate"]),
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
});
export const qaCredentialsSchema = v.strictObject({
  audienceUrl: v.string(),
  moderatorUrl: v.string(),
  moderatorKey: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
});
