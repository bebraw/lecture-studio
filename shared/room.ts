export interface RoomChoice {
  id: string;
  label: string;
}

export interface RoomChoiceCount extends RoomChoice {
  votes: number;
}

export type RoomStatus = "locked" | "open";

export interface RoomSnapshot {
  choices: RoomChoiceCount[];
  currentSelection: string | null;
  revision: number;
  status: RoomStatus;
  totalVotes: number;
}

export type RoomVoteResult =
  | { ok: true; snapshot: RoomSnapshot }
  | {
      ok: false;
      code:
        "invalid-voter-key" | "room-locked" | "unknown-choice" | "rate-limited";
    };

export interface RoomOperations {
  seedChoices(choices: readonly RoomChoice[]): Promise<RoomSnapshot>;
  initializeChoices(choices: readonly RoomChoice[]): Promise<RoomSnapshot>;
  castVote(
    voterKey: string,
    choiceId: string,
    network?: string,
  ): Promise<RoomVoteResult>;
  openSession(session: string): Promise<RoomSnapshot>;
  setStatus(status: RoomStatus): Promise<RoomSnapshot>;
  getSnapshot(voterKey?: string): Promise<RoomSnapshot>;
  resetVotes(): Promise<RoomSnapshot>;
}
