import * as v from "valibot";
const id = v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,60}$/));
export const durationSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(14400),
);
const minutes = v.pipe(v.number(), v.minValue(0), v.maxValue(240));
export const variantsSchema = v.pipe(
  v.record(
    id,
    v.strictObject({
      title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
      slides: v.pipe(v.array(id), v.minLength(1), v.maxLength(100)),
      speakingMinutes: v.pipe(minutes, v.minValue(1)),
      qaMinutes: minutes,
      durations: v.exactOptional(v.record(id, durationSchema)),
    }),
  ),
  v.check(
    (value) => Object.keys(value).length <= 20,
    "At most 20 event variants",
  ),
);
export type EventVariants = v.InferOutput<typeof variantsSchema>;
export const timingSchema = v.object({
  plannedSeconds: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(0),
    v.maxValue(1440000),
  ),
  speakingSeconds: durationSchema,
  qaSeconds: durationSchema,
  untimed: v.array(v.string()),
  overBudget: v.boolean(),
});
export type VariantTiming = v.InferOutput<typeof timingSchema>;
export function timeLabel(seconds: number) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
export function timingLabel(timing: VariantTiming) {
  return (
    `Speaking ${timeLabel(timing.plannedSeconds)} / ${timeLabel(timing.speakingSeconds)} · Q&A ${timeLabel(timing.qaSeconds)}` +
    (timing.overBudget ? " · Over speaking budget" : "") +
    (timing.untimed.length
      ? ` · ${timing.untimed.length} untimed slide(s)`
      : "")
  );
}
