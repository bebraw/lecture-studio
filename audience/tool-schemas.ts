import * as v from "valibot";

export const deploymentSchema = v.object({
  status: v.literal("deployed"),
  origin: v.pipe(v.string(), v.url()),
  workerName: v.string(),
});
export const secretsSchema = v.object({
  PRESENTER_TOKEN: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
});
