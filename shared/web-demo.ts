export const demoContentCsp =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
export function validateDemoState(state: string) {
  if (new TextEncoder().encode(state).length > 16000)
    throw new Error("Demo state exceeds 16 KB");
  const value: unknown = JSON.parse(state);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Demo state must be a JSON object");
  return JSON.stringify(value);
}
export const demoCsp =
  demoContentCsp + "; frame-ancestors 'self'; sandbox allow-scripts";
