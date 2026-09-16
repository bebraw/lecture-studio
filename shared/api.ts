import * as v from "valibot";
import {
  deskSchema,
  draftSchema,
  feedbackSchema,
  noteSchema,
  pollDefinitionSchema,
  searchSchema,
  stageSchema,
} from "./schemas.ts";
const empty = v.strictObject({});
const text = v.string();
const id = v.strictObject({ id: text });
const brief = v.strictObject({ brief: text });
const model = v.strictObject({
  model: v.exactOptional(text),
  retry: v.exactOptional(v.boolean()),
});
export const requestSchemas = {
  draft: draftSchema,
  publish: draftSchema,
  act: v.strictObject({ act: text }),
  blank: v.strictObject({ blank: v.boolean() }),
  brief,
  save: empty,
  restore: empty,
  "publish-brief": brief,
  "publish-sent-brief": empty,
  "show-preview": v.strictObject({ url: text }),
  "source/show": v.strictObject({
    path: text,
    revision: text,
    start: v.number(),
    end: v.number(),
  }),
  "source/return": empty,
  "back-material": empty,
  "codex/connect": empty,
  "codex/disconnect": empty,
  "codex/interrupt": empty,
  "codex/start": v.strictObject({ brief: text, model: v.exactOptional(text) }),
  "codex/answer": v.strictObject({
    id: v.union([text, v.number()]),
    decision: v.picklist(["answer", "accept", "decline"]),
    answers: v.exactOptional(v.record(text, text)),
  }),
  "poll/select": id,
  "poll/configure": pollDefinitionSchema,
  "poll/open": empty,
  "poll/lock": empty,
  "poll/refresh": empty,
  "poll/receipt": empty,
  "poll/show": empty,
  "reset-lecture": v.strictObject({ confirm: v.literal(true) }),
  "new-rehearsal": v.strictObject({ confirm: v.literal(true) }),
  "presentation/live": v.strictObject({ live: v.boolean() }),
  "presentation/load": v.strictObject({ path: text }),
  "presentation/unload": empty,
  "presentation/select": id,
  "presentation/detour": id,
  "presentation/next": empty,
  "presentation/previous": empty,
  "presentation/return": empty,
  "presentation/show": empty,
  "presentation/defaults": empty,
  "presentation/poll-open": empty,
  "presentation/poll-close": empty,
  "presentation/poll-refresh": empty,
  "presentation/poll-question": empty,
  "presentation/poll-results": empty,
  "presentation/build": model,
  feedback: v.strictObject({
    action: v.picklist([
      "start",
      "close",
      "approve",
      "done",
      "show-question",
      "show-cloud",
      "return",
    ]),
    id: v.exactOptional(text),
    mode: v.exactOptional(text),
    prompt: v.exactOptional(text),
  }),
};
export type PostPath = keyof typeof requestSchemas;
type GetPath =
  | "presentation/markdown"
  | "source/files"
  | `source/file?path=${string}`
  | "desk"
  | "library"
  | "stage"
  | "stage-link"
  | "feedback"
  | `note?path=${string}`
  | `search?q=${string}`;
export type ApiPath = GetPath | PostPath;
export type ApiBody<P extends PostPath> = v.InferInput<
  (typeof requestSchemas)[P]
>;
export type ApiArgs<P extends ApiPath> = P extends "feedback"
  ? [value?: ApiBody<"feedback">]
  : P extends PostPath
    ? Record<string, never> extends ApiBody<P>
      ? [value?: ApiBody<P>]
      : [value: ApiBody<P>]
    : [];
export type DeskState = v.InferOutput<typeof deskSchema>;
export type SearchResult = v.InferOutput<typeof searchSchema>;
const librarySchema = v.object({
  files: v.array(v.object({ path: text, label: text })),
});
const stageLinkSchema = v.object({ url: text });
const receiptSchema = v.object({ text });
const sourceFilesSchema = v.object({
  files: v.array(text),
  truncated: v.boolean(),
});
const sourceFileSchema = v.object({ path: text, text, revision: text });
const feedbackResponseSchema = v.union([feedbackSchema, deskSchema]);
export type ApiResponse<P extends ApiPath> = P extends "source/files"
  ? v.InferOutput<typeof sourceFilesSchema>
  : P extends `source/file?${string}`
    ? v.InferOutput<typeof sourceFileSchema>
    : P extends "library"
      ? v.InferOutput<typeof librarySchema>
      : P extends `note?${string}`
        ? v.InferOutput<typeof noteSchema>
        : P extends `search?${string}`
          ? SearchResult
          : P extends "stage"
            ? v.InferOutput<typeof stageSchema>
            : P extends "stage-link"
              ? { url: string }
              : P extends "poll/receipt" | "presentation/markdown"
                ? { text: string }
                : P extends "feedback"
                  ? v.InferOutput<typeof feedbackResponseSchema>
                  : DeskState;
export type ApiClient = <P extends ApiPath>(
  path: P,
  ...args: ApiArgs<P>
) => Promise<ApiResponse<P>>;
export interface MountOptions {
  call: ApiClient;
  update: (state: DeskState) => void;
}
export function validateApiRequest(path: string, value: unknown) {
  if (!Object.hasOwn(requestSchemas, path))
    throw new Error("Unknown API command");
  const result = v.safeParse(requestSchemas[path as PostPath], value);
  if (!result.success) throw new Error("Invalid API command: " + path);
}
export function parseApiResponse<P extends ApiPath>(
  path: P,
  value: unknown,
): ApiResponse<P> {
  const schema =
    path === "source/files"
      ? sourceFilesSchema
      : path.startsWith("source/file?")
        ? sourceFileSchema
        : path === "library"
          ? librarySchema
          : path.startsWith("note?")
            ? noteSchema
            : path.startsWith("search?")
              ? searchSchema
              : path === "stage"
                ? stageSchema
                : path === "stage-link"
                  ? stageLinkSchema
                  : path === "poll/receipt" || path === "presentation/markdown"
                    ? receiptSchema
                    : path === "feedback"
                      ? feedbackResponseSchema
                      : deskSchema;
  const result = v.safeParse(schema, value);
  if (!result.success)
    throw new Error("Invalid response from " + path.split("?")[0]);
  // The path selects the corresponding schema above; TS cannot narrow a conditional generic.
  return result.output as ApiResponse<P>;
}

export type PresentationPath = Extract<PostPath, `presentation/${string}`>;
export type PresentationCommand = {
  [P in PresentationPath]: [path: P, ...args: ApiArgs<P>];
}[PresentationPath];
