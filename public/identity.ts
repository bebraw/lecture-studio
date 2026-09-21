import {
  identityHtml,
  type PresentationIdentity,
  type IdentitySurface,
} from "../shared/identity.ts";
export function applyIdentity(
  document: Document,
  identity: PresentationIdentity | undefined,
  surface: IdentitySurface,
) {
  let host = document.querySelector<HTMLElement>("#presentation-identity");
  if (!host) {
    host = document.createElement("div");
    host.id = "presentation-identity";
    document.querySelector(".stage-bottom")?.before(host);
  }
  const html = identityHtml(identity, surface);
  if (host.innerHTML !== html) host.innerHTML = html;
  host.hidden = !html;
  const legacyLink = document.querySelector<HTMLElement>("#student-link");
  if (legacyLink) legacyLink.hidden = !!identity;
  const legacyTitle = document.querySelector<HTMLElement>(
    ".stage-top > span:first-child",
  );
  if (legacyTitle) legacyTitle.hidden = !!identity;
}
