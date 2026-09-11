# Lecture Studio architecture

Lecture Studio coordinates a private presenter desk, a read-only projector view,
and a public audience companion. The code built during a lecture lives in its own
rehearsal checkout. It is not part of the studio's application runtime.

## Runtime boundaries

| Component          | Owns                                                                                                 | Entry points                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Local Node service | Private drafts, Obsidian reads, presentation sessions, Codex bridge, rehearsal and preview processes | `server.ts`, `lib/`                                                                   |
| Presenter browser  | Private preparation and explicit lecturer actions                                                    | `public/desk.ts`, `public/presentation.ts`, `public/explore.ts`, `public/feedback.ts` |
| Projector browser  | Read-only rendering of the current projection                                                        | `public/stage.ts`                                                                     |
| Public Worker      | Audience HTTP routes and allowlisted public assets                                                   | `audience/worker.ts`, `audience/audience.ts`                                          |
| Durable Objects    | Vote/session storage and the last public stage                                                       | `audience/room-state.ts`, `audience/stage-state.ts`                                   |
| Shared contracts   | Domain models and API response types                                                                 | `shared/`                                                                             |

The local service binds to loopback. `/desk` and `/stage` provide their respective
role tokens to local browsers; stage credentials cannot call presenter APIs.
The public Worker has no Obsidian connector or Codex process. Its asset build uses
an explicit allowlist and excludes the desk, saved material and configuration.

`quality:architecture` enforces runtime import directions. Browser and Worker code
can import shared contracts, but cannot import the local Node runtime. Shared API
contracts use Valibot schemas to validate incoming commands and browser responses;
the endpoint map ties each request body to its response type. Desk response types
are inferred from the same schemas and checked against the server implementation.
Unvalidated input remains `unknown` until parsing succeeds. Scripts and test
fixtures can coordinate multiple runtimes without becoming production imports.

## State and publication

A private draft, the loaded presentation, the current local projection, and the
last successfully delivered public stage are separate state. Loading notes or a
presentation and starting a build do not implicitly publish private material.
Explicit publication and navigation while live change the projection. Preparation
navigation stays private. See [publication and privacy](docs/adrs/001-publication.md).

Public synchronization serializes writes, coalesces intermediate updates, and
reports delivery errors. A disconnected studio does not erase the Worker's stored
stage. An open poll temporarily replaces the student view, independently of what
the lecturer projects; closing it returns students to the last public stage.

Each lecture has a fresh poll session identifier. Opening a room with that new
identifier clears previous votes atomically; reopening the same session preserves
votes. Locked snapshots feed deterministic build inputs. See
[vote lifecycle](docs/adrs/002-vote-lifecycle.md).

## Build and preview lifecycle

The local bridge starts Codex in the selected rehearsal workspace, permits one
active turn, and tracks completion separately from interruption and failure.
Automatic permission review handles eligible escalations within the requested
increment. A generated preview is not evidence that checks passed. See
[build authority and previews](docs/adrs/003-build-authority.md).

## Verification and maintenance

All maintained code uses strict TypeScript with checked indexed access and exact
optional properties. `unknown` belongs at unvalidated boundaries; domain models
name known fields. Runtime validation remains necessary for JSON and external data.

Run `npm run check` for the full baseline. Changed-file pre-push checks can omit
unaffected work, while CI keeps the full baseline. Stryker is a separate targeted
gate; Fallow health/dead-code results are advisory. Local runtime coverage does
not claim browser or Worker coverage.

- [Local CI and retry workflow](docs/local-ci.md)
- [Measured performance and budgets](docs/performance.md)
- [Stabilization history and coverage scope](STABILIZATION.md)

Update these documents and the relevant regression tests when changing an
observable state transition or privacy boundary. Keep decisions short and record
the reason and consequences; tooling scores alone do not define correctness.
