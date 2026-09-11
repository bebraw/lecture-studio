export function asError(value: unknown): Error & {code?: string} {
 if(value instanceof Error)return value;
 return new Error(String(value));
}
export function record(value: unknown): Record<string, unknown> {
 if(!value || typeof value !== "object" || Array.isArray(value))throw new Error("Expected an object");
 return value as Record<string, unknown>;
}
