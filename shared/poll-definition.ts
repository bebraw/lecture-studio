import type { PollDefinition } from "./models.ts";
import { record } from "./errors.ts";
export function validatePoll(input: unknown): PollDefinition {
  const value = record(input);
  if (
    !value ||
    typeof value.question !== "string" ||
    !value.question.trim() ||
    value.question.length > 200 ||
    !Array.isArray(value.options) ||
    value.options.length < 2 ||
    value.options.length > 6
  )
    throw new Error("Use a question and 2–6 predefined options");
  const options = value.options
    .map((input: unknown) => {
      const o = record(input);
      return o;
    })
    .map((o) => {
      if (
        !o ||
        typeof o.id !== "string" ||
        !/^[a-z0-9-]{1,50}$/.test(o.id) ||
        typeof o.label !== "string" ||
        !o.label.trim() ||
        o.label.length > 80
      )
        throw new Error("Options need short IDs and labels");
      return { id: o.id, label: o.label };
    });
  if (
    new Set(options.map((o) => o.id)).size !== options.length ||
    !options.some((o) => o.id === value.defaultId)
  )
    throw new Error("Choose unique option IDs and a valid default");
  return {
    question: value.question,
    options,
    defaultId: String(value.defaultId),
  };
}
