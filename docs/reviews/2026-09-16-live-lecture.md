# Live lecture reflection and improvement plan

Recorded 2026-09-16 from the lecturer's reflection. Priorities below are proposed;
implementation status is recorded at the end. Causes remain unmeasured.

## What happened

- Audience members used multiple-choice feedback and the word cloud. The format
  encouraged interaction and is worth developing further.
- The first demo generated quickly enough and went well.
- The first third felt strong, the second was okay, and the final third came
  close to failing. Slides in the second and third sections were tricky to deliver.
- The second demo took too long. The lecturer could not skip a demo while one
  was generating; the precise blocking interaction still needs reproduction.
- There was no full rehearsal beforehand, and the lecture ran short.
- Downloadable slides felt barebones. Audience members should be able to submit
  freeform questions at any time.
- Some content felt superficial. The lecturer wants to retain the current
  lecture structure entirely in Obsidian and author and tune slides there
  directly, maintaining ownership of the content and making the lecture more
  recognizably their own.

No model identity, build durations, or specific problematic slide IDs were
provided. A slower model is a hypothesis, not an established cause.

## Authoring principle: own the complete lecture in Obsidian

Preserve the current lecture structure as the starting point. Obsidian should
hold the authoritative sequence, slide wording, speaker notes, examples,
references, audience activities, and demo instructions. The studio should load
and present that authored lecture. Repository exports and downloadable copies
should derive from it, without becoming separately maintained versions.

The existing workflow already loads an Obsidian presentation snapshot, but its
definition is a fenced JSON block. Review whether this is comfortable for routine
writing and tuning in Obsidian; storing the content there is only part of making
it practical to author there. Plan a clear edit, preview, and explicit reload
workflow, keeping live projection under the lecturer's control.

Review superficial slides for what the lecturer actually means, why the claim
matters, and which concrete example or experience supports it. Replace generic
claims with their own reasoning and defensible wording; remove claims that do
not earn their place. Assistance with drafting should support those choices.

Acceptance: the lecturer can revise wording, notes, examples, and ordering in
Obsidian, preview the result in the studio, and produce the reading copy from the
same source without editing application code or a second deck. Content revisions
preserve the current structure unless the lecturer chooses to change it.

## 1. Keep the lecture moving when a demo is late

Make every checkpoint usable with a pending, failed, or unavailable build:
continue to the next topic, show a clearly identified prepared result, or return
to the live result later. Completion must not take over the projection.

The current desk enables slide navigation based on adjacent slides, but disables
build starts unless Codex is ready (`public/presentation.ts`). The accepted build
policy permits only one active turn (`docs/adrs/003-build-authority.md`). Reproduce
whether the reported block involved navigation, launching the next demo, or
another interaction before choosing a fix.

Acceptance: with a deliberately slow build, the lecturer can leave its checkpoint,
show prepared evidence, continue presenting, and revisit the result without
waiting or losing the current projection.

## 2. Simplify and rehearse the second and third sections

Review the actual troublesome slides with the lecturer. For each, identify its
single intended takeaway, the concrete example that demonstrates it, and the
transition into the next slide. Keep essential explanations deliverable even
when a demo is unavailable. Make these revisions directly in the authoritative
Obsidian content, following the authoring principle above.

Rehearse the complete lecture with timed checkpoints, including a deliberately
late second demo. Record section end times, generation duration, moderation time,
and which explanations were hard to deliver. Running short should not be treated
as evidence that more content is needed before these causes are understood.

Acceptance: the later sections have a rehearsed spoken path and explicit cuts,
and the closing explanation remains understandable without generated results.

## 3. Prepare results and start builds earlier

Prepare and verify a fallback for each essential demonstration. The existing
run of show already places build launches before explanation; check whether the
actual dependency and launch points leave enough time.

Launch as soon as required audience inputs are resolved and the lecturer starts
the build explicitly. Separate preparation that can happen beforehand from work
that genuinely depends on audience choices.

Benchmark smaller/faster model options on the actual demo tasks, measuring time
to a usable, checked result as well as failures and repair time. Choose a live
waiting budget during rehearsal; a faster response alone is not success.

Consider parallel generation after mapping dependencies: the demos currently
evolve one application and share a builder workflow. Independent jobs need
isolated workspaces, per-job status and cancellation, and explicit selection of
the result to present. Dependent builds need a known starting revision rather
than simultaneous edits to the same checkout. Parallel execution would require
revisiting ADR 003.

## 4. Keep audience questions available throughout the live lecture

Retain the existing private moderation and explicit question projection. Add a
persistent question entry point that remains available during polls, word
collections, slides, and demos, with a pending-question count for the lecturer.

The current implementation preserves separate collections but exposes only one
active feedback mode (`audience/stage-state.ts`). Opening a word collection
therefore does not provide simultaneous question submission. Extend the storage,
API, and audience UI to support questions independently of the current activity.

Acceptance: a student can submit a question during a word cloud or poll; the
lecturer receives it privately without changing the activity or projecting it.

## 5. Improve the downloadable reading copy

Basic print CSS already exists in `public/slides.css`, including A4 sizing and
slide page breaks. Inspect the actual downloaded/printed output and whether the
served version includes those styles before diagnosing missing CSS.

Refine typography, page balance, diagrams, references, and page breaks. Decide
whether the artifact should be a slide facsimile or a reading handout, then
render and inspect every page, particularly dense slides in the later sections.

Acceptance: a complete PDF has legible text and diagrams, useful references, and
no clipped content or accidental blank pages.

## Suggested next implementation

First reproduce the in-progress demo block and implement a reliable continue /
prepared-result path. Alongside future engineering work, revise the
identified later slides and rehearse the recovery path. Persistent questions and
print polish follow; parallel generation is a separate architectural change.
Establish the Obsidian authoring and preview workflow before the next content
revision so improvements remain owned and maintainable there.

## Implemented in this pass

- Added **Skip demo →** at app checkpoints, using slide navigation while the
  current build continues.
- Moved **Stop build** out of Connections into the presentation controls. It
  uses the existing interruption operation and preserves the selected slide.
- Added a private notice naming the active build and explaining how to continue
  or stop before starting another build.
- Browser regression coverage verifies skipping an active build, revisiting a
  checkpoint, late completion preserving the projection, and interruption/retry.

The fixture confirms that slide navigation works during an active turn; the
precise live-session block has not been reproduced. These changes expose the
recovery controls rather than claiming to diagnose that incident. Early launches,
parallel generation, model benchmarks, slide revisions, persistent questions,
and print refinement were initially left as follow-up work.

## Follow-up implementation

The five agreed engineering improvements are now implemented in separate commits:

1. Obsidian Markdown authoring, an editable export, explicit private reload,
   and a reading copy generated from the loaded snapshot. The repository deck
   was converted without changing its content; the existing vault note is not
   overwritten. See [authoring instructions](../obsidian-authoring.md).
2. An independent moderated question queue available throughout Live, including
   during word clouds, votes and demos. It resumes after Live off/on.
3. Explicit prepared/generated demo selection at the four supported checkpoints,
   preserving the choice when revisiting a checkpoint.
4. A refined A4 reading layout, with rendered PDF inspection and a print
   regression check covering the complete deck.
5. Private, persistent build timing history with model, attempt outcome, first
   detected preview and total duration, plus a JSON download for comparisons.

The audience changes require deployment of the matching Worker. This work did
not deploy it or benchmark real models. Earlier launches, parallel generation,
and editorial revision/rehearsal of the lecture remain separate work.
