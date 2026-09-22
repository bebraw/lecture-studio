import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "valibot";
import {
  parseTheme,
  parsePresentation,
  authoringMarkdown,
  PresentationSession,
} from "../lib/presentation.ts";
import { sections } from "../lib/material.ts";
import { themeSchema, stageSchema } from "../shared/schemas.ts";
import { audiencePublicationSchema } from "../shared/audience-schemas.ts";
import { audienceStage } from "../lib/audience-stage.ts";
import { publicationDeck, pdfSlides } from "../lib/pdf-plan.ts";

test("decorative rule flags survive authoring, stage transport and both PDF modes", () => {
  for (const settings of [
    {},
    { headerRule: false },
    { footerRule: false },
    { headerRule: false, footerRule: false },
  ]) {
    const source =
      "## Presentation\n```json\n" +
      JSON.stringify({ version: 1, title: "Rules", theme: settings }) +
      "\n```\n\n## Slide: Title\n```yaml\nid: title\n```\nBody";
    const deck = parsePresentation(sections(source));
    assert.deepEqual(
      parsePresentation(sections(authoringMarkdown(deck))),
      deck,
    );
    assert.deepEqual(parse(themeSchema, deck.theme), deck.theme);
    const state = new PresentationSession(deck, "test").state();
    const stage = { ...state.preview, theme: state.theme };
    assert.deepEqual(parse(stageSchema, stage).theme, deck.theme);
    assert.deepEqual(
      parse(audiencePublicationSchema, audienceStage(stage)).theme,
      deck.theme,
    );
    for (const mode of ["presentation", "publication"] as const)
      assert.deepEqual(
        pdfSlides(
          mode === "publication" ? publicationDeck(deck) : deck,
          {},
          mode,
        )[0]!.stage.theme,
        deck.theme,
      );
  }
  for (const value of ["false", 0, null, [], {}])
    for (const key of ["headerRule", "footerRule"])
      assert.throws(() => parseTheme({ [key]: value }));
  assert.equal(parseTheme().headerRule, undefined);
  assert.equal(parseTheme().footerRule, undefined);
});
