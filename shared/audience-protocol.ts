import { audienceRooms } from "./audience-rooms.ts";
export const audienceProtocol = {
  version: 2,
  features: [
    "lecture-reset",
    "poll-identity",
    "persistent-collections",
    "continuous-questions",
    "web-demo-mirroring",
  ],
  rooms: Object.keys(audienceRooms),
};
export function compatibleAudience(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  const { features, rooms } = input;
  return (
    input.version === audienceProtocol.version &&
    Array.isArray(features) &&
    audienceProtocol.features.every((feature) => features.includes(feature)) &&
    Array.isArray(rooms) &&
    audienceProtocol.rooms.every((room) => rooms.includes(room))
  );
}
