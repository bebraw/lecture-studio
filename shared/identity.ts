import * as v from "valibot";
const short = v.pipe(v.string(), v.maxLength(200));
const image = v.pipe(v.string(), v.maxLength(50000));
export const identitySurfaces = [
  "stage",
  "audience",
  "reading",
  "study",
] as const;
export type IdentitySurface = (typeof identitySurfaces)[number];
export const identitySchema = v.strictObject({
  presenter: v.exactOptional(short),
  affiliation: v.exactOptional(short),
  contactEmail: v.exactOptional(
    v.pipe(
      v.string(),
      v.maxLength(254),
      v.regex(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/),
    ),
  ),
  logo: v.exactOptional(image),
  logoPosition: v.exactOptional(v.picklist(["footer", "top-right"])),
  logoScale: v.exactOptional(
    v.pipe(v.number(), v.minValue(0.5), v.maxValue(3)),
  ),
  joinUrl: v.exactOptional(
    v.pipe(
      v.string(),
      v.maxLength(1000),
      v.check((value) => {
        try {
          const url = new URL(value);
          return (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, "Use a public HTTP(S) audience join URL without credentials"),
    ),
  ),
  qrCode: v.exactOptional(image),
  hideOn: v.exactOptional(v.array(v.picklist(identitySurfaces))),
});
export type PresentationIdentity = v.InferOutput<typeof identitySchema>;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const identityImage = (
  source: string | undefined,
  label: string,
  className: string,
) =>
  source &&
  /^data:image\/(?:svg\+xml|png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(
    source,
  )
    ? '<img class="' +
      className +
      '" src="' +
      escape(source) +
      '" alt="' +
      escape(label) +
      '">'
    : "";
export function identityHtml(
  identity: PresentationIdentity | undefined,
  surface: IdentitySurface,
) {
  if (!identity || identity.hideOn?.includes(surface)) return "";
  const logo =
    surface === "stage" && identity.logoPosition === "top-right"
      ? ""
      : identityImage(
          identity.logo,
          identity.affiliation
            ? identity.affiliation + " logo"
            : "Institution logo",
          "identity-logo",
        );
  const person =
    identity.presenter || identity.affiliation || identity.contactEmail;
  if (!logo && !person && !identity.joinUrl && !identity.qrCode) return "";
  return (
    '<aside class="presentation-identity" aria-label="Presenter and audience information">' +
    logo +
    '<div class="identity-person">' +
    (identity.presenter
      ? "<strong>" + escape(identity.presenter) + "</strong>"
      : "") +
    (identity.affiliation
      ? "<span>" + escape(identity.affiliation) + "</span>"
      : "") +
    (identity.contactEmail
      ? '<a href="mailto:' +
        escape(identity.contactEmail) +
        '">' +
        escape(identity.contactEmail) +
        "</a>"
      : "") +
    "</div>" +
    (identity.joinUrl
      ? '<a class="identity-join" href="' +
        escape(identity.joinUrl) +
        '" target="_blank" rel="noopener noreferrer">Join the audience<span>' +
        escape(identity.joinUrl) +
        "</span></a>"
      : "") +
    identityImage(identity.qrCode, "Scan to join the audience", "identity-qr") +
    "</aside>"
  );
}

/** Header branding is independent of the presenter footer on slide surfaces. */
export function identityTopLogoHtml(
  identity: PresentationIdentity | undefined,
) {
  if (
    !identity ||
    identity.logoPosition !== "top-right" ||
    identity.hideOn?.includes("stage")
  )
    return "";
  return identityImage(
    identity.logo,
    identity.affiliation ? identity.affiliation + " logo" : "Institution logo",
    "identity-logo",
  );
}
