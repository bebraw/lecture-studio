import {
  identityHtml,
  identityTopLogoHtml,
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
  const logoHtml = surface === "stage" ? identityTopLogoHtml(identity) : "";
  let logo = document.querySelector<HTMLElement>(".identity-top-logo");
  if (logoHtml && !logo) {
    logo = document.createElement("div");
    logo.className = "identity-top-logo";
    document.querySelector(".stage > header")?.append(logo);
  }
  if (logo && logo.innerHTML !== logoHtml) logo.innerHTML = logoHtml;
  if (logo && !logoHtml) logo.remove();
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
