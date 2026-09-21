import * as v from "valibot";
import type { Stage } from "./models.ts";
export const pdfOptionsSchema = v.strictObject({
  aspectRatio: v.exactOptional(v.picklist(["16:9", "4:3"])),
  fonts: v.exactOptional(
    v.pipe(
      v.array(
        v.strictObject({
          family: v.pipe(v.string(), v.regex(/^[a-zA-Z][a-zA-Z0-9 -]{0,79}$/)),
          source: v.pipe(
            v.string(),
            v.regex(
              /^\.\/(?!.*(?:\.\.|[\\:#?%]))[^\r\n]+\.(?:woff2?|ttf|otf)$/i,
            ),
          ),
          weight: v.exactOptional(v.picklist(["normal", "bold"])),
          style: v.exactOptional(v.picklist(["normal", "italic"])),
        }),
      ),
      v.maxLength(16),
    ),
  ),
});
export type PdfOptions = v.InferOutput<typeof pdfOptionsSchema>;
export interface PdfSlide {
  id: string;
  label: string;
  stage: Partial<Stage>;
}
declare global {
  interface Window {
    renderPdf: (slides: PdfSlide[]) => Promise<void>;
  }
}

const caption = v.pipe(v.string(), v.minLength(1), v.maxLength(500));
export const demoSequenceSchema = v.pipe(
  v.array(
    v.union([
      v.strictObject({
        caption,
        state: v.pipe(
          v.string(),
          v.maxLength(16000),
          v.check((state) => {
            try {
              const value: unknown = JSON.parse(state);
              return (
                !!value && typeof value === "object" && !Array.isArray(value)
              );
            } catch {
              return false;
            }
          }, "Demo state must be a JSON object string"),
        ),
      }),
      v.strictObject({
        caption,
        image: v.pipe(
          v.string(),
          v.regex(
            /^\.\/(?!.*(?:\.\.|[\\:#?%]))[^\r\n]+\.(?:svg|png|jpe?g|gif|webp)$/i,
          ),
        ),
      }),
    ]),
  ),
  v.minLength(1),
  v.maxLength(30),
);
export type DemoFrame = v.InferOutput<typeof demoSequenceSchema>[number];
