import { compatibleAudience } from "../shared/audience-protocol.ts";
const base = process.argv[2] || "https://live.scalableweb.dev";
const response = await fetch(new URL("/api/capabilities", base), {
  signal: AbortSignal.timeout(10000),
});
if (!response.ok || !compatibleAudience(await response.json()))
  throw new Error(
    "Deployed audience protocol or rooms do not match this release",
  );
const audience = await fetch(new URL("/api/audience", base), {
  signal: AbortSignal.timeout(10000),
});
if (!audience.ok) throw new Error("Deployed audience endpoint failed");
console.log("Audience protocol and rooms match; public endpoint responds.");
