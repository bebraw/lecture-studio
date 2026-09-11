# 002: Lecture sessions and frozen vote inputs

Status: accepted. Recorded: 2026-09-11.

## Context

Vote storage survives a studio restart. That is useful within a lecture, but old
counts must not become the starting result of a new lecture. Network retries and
reopening a question must not accidentally delete votes already cast this run.

## Decision

Use a fresh lecture session ID when the local poll controller is created or reset.
The first authenticated open for each room carries that ID. In one Durable Object
storage transaction, a different session clears old votes, records the new ID,
updates the revision and opens voting. Opening the same session preserves votes.
Seed operations initialize empty rooms and never reset existing choices/votes.

Before a room has opened in the current local session, its old counts are hidden
locally. Resetting the lecture does not immediately wipe every remote room:
replacement happens when that room opens for the new session.

Closing voting freezes a validated snapshot and revision. No votes select the
prepared default; ties select the default if tied, otherwise prepared option order.
Build dependencies use that frozen decision or a prepared default explicitly
accepted by the lecturer. Refreshing results cannot silently rewrite a frozen
build input. Reopening voting makes a new result possible within the same session.

## Consequences and verification

Session IDs are an idempotence mechanism for a trusted presenter, not a guarantee
against deliberate replay by someone holding its credential. Cookie-backed vote
replacement is convenience deduplication, not strong voter identity.

Tests: `tests/room-session.test.ts`, `tests/audience-poll.test.ts`,
`tests/presentation.test.ts`, and `browser-tests/build-workflow.spec.ts`.
