import * as v from "valibot";
import type { Stage, FeedbackSnapshot, Note } from "./models.ts";

const text = v.string();
const count = v.pipe(v.number(), v.integer(), v.minValue(0));
const optionalText = v.exactOptional(text);
const strings = v.array(text);
const stringMap = v.record(text, text);
export const themeSchema = v.object({
  background: text,
  text,
  muted: text,
  accent: text,
  headingFont: text,
  bodyFont: text,
  codeFont: text,
});
export const draftSchema = v.object({
  act: text,
  mode: text,
  title: text,
  body: text,
  source: text,
  diagram: text,
  demoUrl: text,
  allowRemoteImages: v.boolean(),
});
const buildSchema = v.object({
  status: text,
  activity: optionalText,
  startedAt: v.exactOptional(v.nullable(v.number())),
  finishedAt: v.exactOptional(v.nullable(v.number())),
  outcome: v.exactOptional(v.nullable(text)),
});
export const stageSchema = v.object({
  act: text,
  mode: text,
  title: text,
  html: text,
  source: text,
  diagram: text,
  demoUrl: text,
  version: v.union([text, v.number()]),
  brief: optionalText,
  theme: v.exactOptional(
    v.object({
      background: optionalText,
      text: optionalText,
      muted: optionalText,
      accent: optionalText,
      headingFont: optionalText,
      bodyFont: optionalText,
      codeFont: optionalText,
    }),
  ),
  live: v.exactOptional(v.boolean()),
  blank: v.exactOptional(v.boolean()),
  build: v.exactOptional(buildSchema),
  projectionKind: optionalText,
  slidePosition: v.exactOptional(
    v.nullable(
      v.object({
        number: count,
        total: count,
        progress: v.nullable(v.number()),
      }),
    ),
  ),
}) satisfies v.GenericSchema<Stage>;
export const noteSchema = v.object({
  path: optionalText,
  title: optionalText,
  sections: v.array(
    v.object({ heading: text, body: text, html: optionalText }),
  ),
}) satisfies v.GenericSchema<Note>;
const optionSchema = v.object({ id: text, label: text });
export const pollDefinitionSchema = v.object({
  question: text,
  options: v.array(optionSchema),
  defaultId: text,
});
const snapshotSchema = v.object({
  status: v.picklist(["open", "locked"]),
  revision: count,
  totalVotes: count,
  choices: v.array(v.object({ ...optionSchema.entries, votes: count })),
});
const frozenSchema = v.object({
  ...snapshotSchema.entries,
  question: text,
  winner: optionSchema,
  reason: text,
  capturedAt: text,
});
const pollSchema = v.object({
  config: pollDefinitionSchema,
  snapshot: v.nullable(snapshotSchema),
  frozen: v.nullable(frozenSchema),
  pollId: text,
  decisions: v.record(
    text,
    v.object({ ...frozenSchema.entries, instruction: text }),
  ),
  presets: v.record(text, pollDefinitionSchema),
  configured: v.boolean(),
  busy: v.boolean(),
  error: text,
  joinUrl: text,
});
const stepSchema = v.object({
  id: text,
  type: text,
  title: text,
  body: optionalText,
  notes: optionalText,
  source: optionalText,
  chapter: optionalText,
  next: optionalText,
  related: v.exactOptional(strings),
  uses: v.exactOptional(
    v.array(v.object({ poll: text, instructions: stringMap })),
  ),
  allowRemoteImages: v.exactOptional(v.boolean()),
  poll: v.exactOptional(pollDefinitionSchema),
  room: optionalText,
});
const inputSchema = v.object({
  poll: text,
  selected: text,
  default: v.boolean(),
  revision: v.nullable(count),
});
const presentationSchema = v.object({
  theme: themeSchema,
  preview: stageSchema,
  outline: v.array(
    v.pick(stepSchema, ["id", "title", "type", "chapter", "next", "related"]),
  ),
  title: text,
  path: text,
  loadedAt: text,
  current: text,
  step: stepSchema,
  related: v.array(stepSchema),
  canReturn: v.boolean(),
  canPrevious: v.boolean(),
  resolved: v.object({
    prompt: text,
    missing: strings,
    inputs: v.array(inputSchema),
  }),
  runs: v.array(
    v.object({
      step: text,
      prompt: text,
      inputs: v.array(inputSchema),
      model: optionalText,
      startedAt: text,
    }),
  ),
});
const questionSchema = v.object({
  id: text,
  header: optionalText,
  question: text,
  options: v.exactOptional(
    v.array(v.object({ label: text, description: optionalText })),
  ),
  isOther: v.exactOptional(v.boolean()),
  isSecret: v.exactOptional(v.boolean()),
});
export const bridgeSchema = v.object({
  ...buildSchema.entries,
  threadId: v.nullable(text),
  turnId: v.nullable(text),
  workspace: optionalText,
  model: optionalText,
  models: v.array(
    v.object({
      id: text,
      name: optionalText,
      isDefault: v.exactOptional(v.boolean()),
    }),
  ),
  messages: v.array(v.object({ id: text, text })),
  requests: v.array(
    v.object({
      id: v.union([text, v.number()]),
      method: text,
      params: v.object({
        command: optionalText,
        reason: optionalText,
        questions: v.exactOptional(v.array(questionSchema)),
      }),
    }),
  ),
});
export const deskSchema = v.object({
  live: v.boolean(),
  projection: stageSchema,
  audienceSync: v.object({ error: text }),
  presentation: v.nullable(presentationSchema),
  graphPoll: v.nullable(pollSchema),
  acts: v.array(
    v.object({
      id: text,
      era: text,
      time: text,
      title: text,
      question: text,
      note: text,
      transition: text,
      brief: text,
    }),
  ),
  scope: text,
  draft: draftSchema,
  draftPreview: stageSchema,
  stage: stageSchema,
  blank: v.boolean(),
  canReturnToMaterial: v.boolean(),
  activeAct: text,
  brief: text,
  lastBrief: text,
  codex: bridgeSchema,
  libraryStatus: text,
  workspace: text,
  savedAt: v.nullable(text),
  rehearsalJob: v.object({
    status: text,
    error: optionalText,
    workspace: optionalText,
  }),
  resetVersion: count,
  poll: pollSchema,
});
export const feedbackSchema = v.object({
  config: v.nullable(
    v.object({ round: text, mode: text, prompt: text, open: v.boolean() }),
  ),
  items: v.array(v.object({ id: text, text, status: text })),
}) satisfies v.GenericSchema<FeedbackSnapshot>;
export const searchSchema = v.object({
  matches: v.array(
    v.object({
      path: optionalText,
      title: optionalText,
      section: text,
      snippet: text,
      score: count,
    }),
  ),
  unavailable: count,
});
export const errorSchema = v.object({ error: text });
