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
