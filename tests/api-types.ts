import type { ApiClient, DeskState } from "../shared/api.ts";

// Compile-only regression checks: tsc must reject these invalid client calls.
export async function checkApiTypes(call: ApiClient) {
  const desk: DeskState = await call("codex/start", { brief: "Reviewed" });
  await call("presentation/show");
  await call("note?path=lecture.md");
  // @ts-expect-error Unknown endpoint.
  await call("codex/strat", { brief: "Reviewed" });
  // @ts-expect-error A build requires a brief.
  await call("codex/start", {});
  // @ts-expect-error A required command body cannot be omitted.
  await call("presentation/live");
  // @ts-expect-error Live accepts a boolean.
  await call("presentation/live", { live: "yes" });
  // @ts-expect-error GET endpoints cannot receive a command body.
  await call("stage", { blank: true });
  return desk;
}
