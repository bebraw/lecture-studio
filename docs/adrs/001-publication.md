# 001: Explicit publication and private context

Status: accepted. Recorded: 2026-09-11.

## Context

The lecturer needs to browse private notes and prepare the next action while
students continue seeing the previously selected material. Publishing the entire
desk state would expose notes, build prompts, model output and workspace details.

## Decision

Keep preparation state separate from projection state. Loading notes, loading a
presentation, editing a draft, and starting a build do not publish them. A Show
action or live presentation navigation selects what is projected. The local
stage has a read-only token; the public audience receives an allowlisted projection
through the authenticated local-to-Worker synchronization path.

The public stage includes only selected content, theme and bounded generic build
status. Obsidian notes, unshown slides, raw model messages, build requests,
workspace paths and presenter tokens remain private. Public feedback projection
uses only explicitly selected questions or approved word-cloud entries.

## Consequences and verification

The public stage can lag behind the local projector or retain the last delivered
slide after disconnection. Delivery failures must be visible to the lecturer.
Opening voting affects the student form independently of the projected slide.

Tests: `tests/core.test.ts`, `tests/audience-stage.test.ts`,
`tests/audience-broadcast.test.ts`, `tests/feedback.test.ts`, and
`browser-tests/presentation.spec.ts`. Extend these when adding public fields or
new publication triggers.
