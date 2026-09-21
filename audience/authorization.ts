export async function authorized(request: Request, secret: string) {
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  if (supplied.length > 4096) return false;
  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode("Bearer " + secret)),
  ]);
  return crypto.subtle.timingSafeEqual(suppliedHash, expectedHash);
}
