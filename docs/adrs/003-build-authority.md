# 003: Build authority and preview publication

Status: accepted. Recorded: 2026-09-11.

## Context

Builds should progress while the lecturer speaks, without routine questions
interrupting the session. They still need a bounded workspace and an explicit
trigger, and an app URL must not be confused with verified completion.

## Decision

Start a build only from an explicit lecturer action with resolved inputs. Use the
selected rehearsal checkout and a workspace-write sandbox, with on-request
permissions and the automatic approval reviewer. Ordinary authorized work can
continue; broad permission requests are not automatically accepted by the desk.
Denied operations use permitted alternatives or report a blocked step. Deployment
requires an explicit request. The implementation agent gets reviewed inputs,
not automatic access to Obsidian or the lecturer's private notes.

Allow one active Codex turn. Report completed, interrupted and failed outcomes
separately; do not automatically retry an ambiguous timed-out build. Reset stops
owned build/preview processes and clears session state while preserving project
files and saved material. A new rehearsal creates a numbered checkout and only
switches the active workspace after setup succeeds.

Show on stage explicitly selects an app preview. The projector can use its local
URL; audience sharing uses the selected app's HTTPS tunnel URL, rendered by the
public companion at `live.scalableweb.dev`. The desk and its API are never the
tunnel target. A local URL that cannot be shared becomes a follow-the-projector
message on the public stage. Tunnel ownership and cleanup belong to the local
studio. This is temporary preview sharing, not deployment of the generated app.

## Consequences and verification

Automatic review can still deny an escalation. A ready preview can still contain
an incomplete build. Keep permission status, preview availability and verification
results distinct in the UI. A tunnel depends on the lecturer's machine and is
stopped when its owned preview lifecycle ends.

Tests: `tests/codex.test.ts`, `tests/rehearsals.test.ts`,
`tests/preview-tunnel.test.ts`, `tests/previews.test.ts`, and
`browser-tests/build-workflow.spec.ts`.
