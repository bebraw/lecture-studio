import * as v from "valibot";
const index = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100));
const step = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20));
export const revealDefinitionSchema = v.strictObject({
  rows: v.exactOptional(
    v.pipe(
      v.array(
        v.strictObject({
          step,
          table: index,
          rows: v.pipe(v.array(index), v.minLength(1), v.maxLength(100)),
        }),
      ),
      v.maxLength(100),
    ),
  ),
});
export const revealStateSchema = v.pipe(
  v.object({
    current: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(20)),
    total: step,
  }),
  v.check((value) => value.current <= value.total),
);
export type RevealDefinition = v.InferOutput<typeof revealDefinitionSchema>;
export type RevealState = v.InferOutput<typeof revealStateSchema>;
