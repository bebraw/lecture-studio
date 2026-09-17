import * as v from "valibot";
const text = v.string();
export const studyStepSchema = v.object({
  id: text,
  title: text,
  chapter: text,
  html: text,
  source: text,
  explanationHtml: text,
  posterHtml: v.exactOptional(text),
  activity: v.exactOptional(
    v.object({
      promptHtml: text,
      answerHtml: text,
      correctOption: v.exactOptional(text),
      options: v.array(v.object({ id: text, label: text })),
    }),
  ),
  demo: v.exactOptional(v.object({ url: text, revision: text })),
});
export const studyModuleSchema = v.object({
  format: v.literal("lecture-studio-study-module"),
  version: v.literal(1),
  courseId: text,
  id: text,
  title: text,
  description: text,
  revision: text,
  steps: v.array(studyStepSchema),
});
export type StudyStep = v.InferOutput<typeof studyStepSchema>;
export type StudyModule = v.InferOutput<typeof studyModuleSchema>;
export const studyCourseSchema = v.object({
  format: v.literal("lecture-studio-study-course"),
  version: v.literal(1),
  id: text,
  title: text,
  description: text,
  modules: v.array(
    v.object({
      id: text,
      title: text,
      description: text,
      href: text,
      data: text,
      revision: text,
      steps: v.number(),
    }),
  ),
});
export type StudyCourse = v.InferOutput<typeof studyCourseSchema>;
