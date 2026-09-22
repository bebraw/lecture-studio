import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePresentation,
  authoringMarkdown,
  PresentationSession,
} from "../lib/presentation.ts";
import {
  loadPresentationImages,
  presentationIdentity,
} from "../lib/presentation-images.ts";
import { renderHandout } from "../lib/handout.ts";
import { studySteps } from "../lib/study-export.ts";
import { audienceStage } from "../lib/audience-stage.ts";
import { identityHtml } from "../shared/identity.ts";
const identity = {
  presenter: "Ada <Example>",
  affiliation: "Example University",
  contactEmail: "presenter@example.org",
  logo: "./logo.svg",
  joinUrl: "https://example.org/join",
  qrCode: "./qr.svg",
};
const parse = (brand: unknown = identity) =>
  parsePresentation({
    sections: [
      {
        heading: "Presentation",
        body:
          "```json\n" +
          JSON.stringify({
            version: 1,
            title: "Conference",
            start: "one",
            identity: brand,
            steps: [
              {
                id: "one",
                type: "material",
                title: "Example",
                body: "Content",
                next: "two",
              },
              {
                id: "two",
                type: "material",
                title: "Full slide",
                hideIdentity: true,
              },
            ],
          }) +
          "\n```",
      },
    ],
  });

test("identity survives stage and public exports while authoring retains local paths and build context excludes it", async () => {
  const deck = parse();
  await loadPresentationImages(deck, async () =>
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text y="20">Logo</text></svg>',
    ),
  );
  const session = new PresentationSession(deck, "test");
  const resolved = presentationIdentity(deck)!;
  assert.match(resolved.logo!, /^data:image\/svg\+xml;base64,/);
  assert.equal(session.state().preview.identity?.presenter, identity.presenter);
  assert.deepEqual(audienceStage(session.state().preview).identity, resolved);
  assert.match(renderHandout(deck), /Ada &lt;Example&gt;/);
  assert.equal(
    (renderHandout(deck).match(/class="presentation-identity"/g) || []).length,
    1,
  );
  assert.match(studySteps(deck)[0]!.identityHtml!, /presenter@example.org/);
  assert.equal(studySteps(deck)[1]!.identityHtml, "");
  assert.doesNotMatch(
    session.resolve().prompt,
    /presenter@example|Example University/,
  );
  assert.match(authoringMarkdown(deck), /\.\/logo.svg/);
  assert.doesNotMatch(authoringMarkdown(deck), /base64/);
  const hidden = { ...resolved, hideOn: ["audience", "study"] as const };
  assert.equal(
    identityHtml({ ...hidden, hideOn: [...hidden.hideOn] }, "audience"),
    "",
  );
  assert.match(
    identityHtml({ ...hidden, hideOn: [...hidden.hideOn] }, "stage"),
    /Example University/,
  );
});

test("identity rejects unsafe links, remote assets and oversized branding", async () => {
  for (const brand of [
    { joinUrl: "javascript:alert(1)" },
    { joinUrl: "https://secret@example.org" },
    { logo: "../private.svg" },
    { logo: "https://example.org/logo.svg" },
    { qrCode: "./qr.svg" },
    { contactEmail: "not an email" },
    { hideOn: ["unknown"] },
  ])
    assert.throws(() => parse(brand));
  await assert.rejects(
    loadPresentationImages(parse(), async () => new Uint8Array(32001)),
    /32 KB/,
  );
});

test("top-right branding is independent of the footer and respects publication and variant controls", async () => {
  const { identityTopLogoHtml } = await import("../shared/identity.ts");
  const { publicationDeck, pdfSlides } = await import("../lib/pdf-plan.ts");
  const { selectVariant } = await import("../lib/variants.ts");
  const deck = parse({ logo: "./logo.svg", logoPosition: "top-right" });
  deck.variants = {
    conference: {
      title: "Conference",
      slides: ["one"],
      speakingMinutes: 12,
      qaMinutes: 3,
      identity: { logoPosition: "footer" },
    },
  };
  assert.equal(
    selectVariant(deck, "conference").identity?.logoPosition,
    "footer",
  );
  const published = publicationDeck(deck);
  for (const current of [deck, published]) {
    await loadPresentationImages(current, async () =>
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"/>',
      ),
    );
    const brand = presentationIdentity(current)!;
    assert.equal(identityHtml(brand, "stage"), "");
    assert.match(identityTopLogoHtml(brand), /identity-logo/);
    assert.equal(identityTopLogoHtml({ ...brand, hideOn: ["stage"] }), "");
    assert.equal(
      identityTopLogoHtml(presentationIdentity(current, current.steps[1])),
      "",
    );
    assert.equal(
      pdfSlides(current)[0]!.stage.identity?.logoPosition,
      "top-right",
    );
    assert.match(
      identityHtml({ ...brand, presenter: "Presenter" }, "stage"),
      /Presenter/,
    );
    assert.doesNotMatch(
      identityHtml({ ...brand, presenter: "Presenter" }, "stage"),
      /identity-logo/,
    );
    assert.match(
      identityHtml({ ...brand, logoPosition: "footer" }, "stage"),
      /identity-logo/,
    );
  }
  assert.throws(() => parse({ logo: "./logo.svg", logoPosition: "left" }));
});

test("logo scale validates bounds and survives event and publication overrides", async () => {
  const { selectVariant } = await import("../lib/variants.ts");
  const { publicationDeck } = await import("../lib/pdf-plan.ts");
  for (const logoScale of [0.5, 1, 2, 3])
    assert.equal(
      parse({ logo: "./logo.svg", logoPosition: "top-right", logoScale })
        .identity?.logoScale,
      logoScale,
    );
  for (const logoScale of [0, -1, 0.49, 3.01, "2", null, Infinity, NaN])
    assert.throws(() => parse({ logoScale }));
  const deck = parse({ logo: "./logo.svg", logoPosition: "top-right" });
  assert.equal(deck.identity?.logoScale, undefined);
  deck.variants = {
    conference: {
      title: "Conference",
      slides: ["one"],
      speakingMinutes: 12,
      qaMinutes: 3,
      identity: { logoScale: 2 },
    },
  };
  const selected = selectVariant(deck, "conference");
  assert.equal(selected.identity?.logoScale, 2);
  assert.equal(selected.identity?.logo, "./logo.svg");
  selected.pdf = { publicationIdentity: { logoScale: 1.5 } };
  assert.equal(publicationDeck(selected).identity?.logoScale, 1.5);
  assert.equal(selected.identity?.logoScale, 2);
});
