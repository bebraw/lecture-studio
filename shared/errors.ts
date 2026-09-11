export function asError(value: unknown): Error & { code?: string } {
  if (value instanceof Error) return value;
  return new Error(String(value));
}
// DOM events, timers and Node callbacks do not observe returned promises.
export function asyncHandler<Args extends unknown[]>(
  run: (...args: Args) => Promise<unknown>,
  report: (error: Error) => void = console.error,
): (...args: Args) => void {
  return (...args) => {
    void run(...args).catch((error: unknown) => report(asError(error)));
  };
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object");
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error("Expected text for " + label);
  return value;
}
export function optionalString(
  value: unknown,
  label: string,
): string | undefined {
  return value === undefined ? undefined : stringValue(value, label);
}
export function stringMap(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(record(value)).map(([key, item]) => [
      key,
      stringValue(item, key),
    ]),
  );
}
