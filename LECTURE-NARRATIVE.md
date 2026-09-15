# Lecture run of show

The canonical content is the Obsidian presentation; [the exported deck](docs/presentations/web-development-2026.md) records the same sequence. Use stable slide IDs below; slide numbers change when content changes.

## Proposed 90-minute budget

This is a delivery budget, not a measured full-length rehearsal. Automated tests exercise behavior, not speaking and moderation time.

| Minutes | Segment                                                          | Evidence to preserve                                                      |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 0–5     | Opening: route and learning outcomes                             | Students know the three explanation tasks                                 |
| 5–30    | Past: CERN, audience needs, history, Document A and native form  | Needs → document structure; trace POST → Database → GET                   |
| 30–55   | Present: needs and priority, build, AJAX and failure experiments | Compare native/AJAX; distinguish server state from browser knowledge      |
| 55–75   | Future: tasks, contract, build and comparison                    | Same task and source revision in fixed/generated views; inspect one claim |
| 75–80   | Recap and transfer problem                                       | Three explanations, not another preference vote                           |
| 80–90   | Reserved recovery and questions                                  | Do not pre-fill this margin with more exposition                          |

Four explicit builds run during explanation, not as four separate waiting periods. At each checkpoint, use the observed app if ready; otherwise use a clearly identified prepared baseline or state that the result is unavailable. A completed model turn is not a passed acceptance test.

## Launches and checkpoints

1. **build-document** follows audience needs, friction/theme votes and the architecture map. Check at **check-document** and revisit the approved needs.
2. **build-forms** follows the proposed survey fields. Trace the native flow while it runs. Submit only at **check-native-form**.
3. **build-application** follows Present needs and the interaction-priority vote. The vote selects the FIRST acceptance test: confirmation, preservation, or shared updates. Keep all baseline protections. Show expected → observed → result at the checkpoint.
4. **build-agents** follows the audience task/priority and the runtime contract. Compare fixed and generated views on the same task and frozen source revision. Verify one claim and one permitted action.

Navigation opens audience activities but never starts implementation. **Start this build** launches the reviewed prompt. **Retry this build** reuses the failed attempt’s original approved inputs.

## Where to save time

These are marked OPTIONAL in the presenter notes:

- **vision-nelson**, **vision-comparison**: shorten the historical comparison, while retaining CERN, Bush and Engelbart.
- **rendering-cached**, **activation-detour**: omit the caching/activation extension if the native/AJAX distinction needs more time.
- **application-interface-choice**: take one spoken application example instead of a pair discussion.

Use the flat slide list to move to the next retained slide. Do not cut the native/AJAX trace, controlled failure experiment, app evidence checkpoints or closing transfer task. Repeated link/action/interface diagrams have been merged.

## Rehearsal record to complete before delivery

Record actual section end times, build durations, moderation time, first-test outcomes and recovery time. If a segment exceeds budget, use the cuts above; do not silently remove the evidence checks. The automated real-deck rehearsal verifies every poll/collection and build-input handoff against a disposable Worker, with the implementation agent stubbed.
