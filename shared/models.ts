export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Theme = Record<
  | "background"
  | "text"
  | "muted"
  | "accent"
  | "headingFont"
  | "bodyFont"
  | "codeFont",
  string
>;
export interface Draft {
  act: string;
  mode: string;
  title: string;
  body: string;
  source: string;
  diagram: string;
  demoUrl: string;
  allowRemoteImages: boolean;
}
export interface BuildState {
  status: string;
  activity?: string;
  startedAt?: number | null;
  finishedAt?: number | null;
  outcome?: string | null;
}
export interface Stage {
  act: string;
  mode: string;
  title: string;
  html: string;
  source: string;
  diagram: string;
  demoUrl: string;
  version: string | number;
  brief?: string;
  theme?: Partial<Theme>;
  live?: boolean;
  blank?: boolean;
  build?: BuildState;
  projectionKind?: string;
  slideType?: string;
  slidePosition?: {
    number: number;
    total: number;
    progress: number | null;
  } | null;
}
export interface Note {
  path?: string;
  title?: string;
  sections: { heading: string; body: string; html?: string }[];
}
export interface NoteFile {
  path: string;
  label: string;
}
export interface Library {
  status: string;
  list(): Promise<NoteFile[]>;
  read(path: string): Promise<Note>;
  close(): Promise<void>;
}
export interface PollOption {
  id: string;
  label: string;
}
export interface PollDefinition {
  question: string;
  options: PollOption[];
  defaultId: string;
}
export interface PollSnapshot {
  status: "open" | "locked";
  revision: number;
  totalVotes: number;
  choices: (PollOption & { votes: number })[];
}
export interface FrozenPoll extends PollSnapshot {
  question: string;
  winner: PollOption;
  reason: string;
  capturedAt: string;
}
export interface PollRound {
  config: PollDefinition;
  snapshot: PollSnapshot | null;
  frozen: FrozenPoll | null;
}
export interface PollState extends PollRound {
  pollId: string;
  decisions: Record<string, FrozenPoll & { instruction: string }>;
  presets: Record<string, PollDefinition>;
  configured: boolean;
  busy: boolean;
  error: string;
  joinUrl: string;
}
export interface Dependency {
  poll: string;
  instructions: Record<string, string>;
}
export interface Step {
  id: string;
  type: string;
  title: string;
  body?: string;
  notes?: string;
  source?: string;
  chapter?: string;
  next?: string;
  related?: string[];
  uses?: Dependency[];
  previewOf?: string;
  allowRemoteImages?: boolean;
  poll?: PollDefinition;
  room?: string;
}
export interface PresentationDefinition {
  version: 1;
  title: string;
  start: string;
  steps: Step[];
  theme: Theme;
}
export interface BuildInput {
  poll: string;
  selected: string;
  default: boolean;
  revision: number | null;
}
export interface BuildRun {
  step: string;
  prompt: string;
  inputs: BuildInput[];
  model?: string;
  startedAt: string;
}
export interface ApprovalQuestion {
  id: string;
  header?: string;
  question: string;
  options?: { label: string; description?: string }[];
  isOther?: boolean;
  isSecret?: boolean;
}
export interface ApprovalParams {
  command?: string;
  reason?: string;
  questions?: ApprovalQuestion[];
}
export interface ApprovalRequest {
  id: string | number;
  method: string;
  params: ApprovalParams;
}
export interface BridgeState extends BuildState {
  threadId: string | null;
  turnId: string | null;
  workspace?: string;
  messages: { id: string; text: string }[];
  requests: ApprovalRequest[];
  model?: string;
  models: { id: string; name?: string; isDefault?: boolean }[];
}
export interface Bridge {
  state: BridgeState;
  snapshot(): BridgeState;
  connect(workspace: string): Promise<void>;
  start(prompt: string, model?: string): Promise<void>;
  interrupt(): Promise<void>;
  answer(
    id: string | number,
    decision: string,
    answers?: Record<string, string>,
  ): void;
  close(): void;
}
export interface FeedbackConfig {
  round: string;
  mode: string;
  prompt: string;
  open: boolean;
}
export interface FeedbackItem {
  id: string;
  text: string;
  status: string;
}
export interface FeedbackSnapshot {
  config: FeedbackConfig | null;
  items: FeedbackItem[];
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
