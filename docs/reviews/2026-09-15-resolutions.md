# Review resolutions

Companion to the [strict review](2026-09-15.md). Changes were implemented and committed individually for lecturer review. The Obsidian presentation and exported JSON are synchronized; the revised deck contains 93 slides including References.

| Finding                            | Change and commit                                                                                                                                    | Verification                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1 · Missing Present poll           | Shared room manifest, all four rooms, initialize on opening · `321d674`                                                                              | Real deck options match every Worker room; native tests cover all four                                 |
| 2 · Cloud startup order            | Confirm live stage before collection; rollback on failure · `fb432fa`                                                                                | Cold start and off/on on a real word-cloud slide; focused broadcast ordering test                      |
| 3 · Old poll replaces discussion   | Explicit poll identity; close/freeze on departure · `52a3bb8`, `94c0159`                                                                             | Real-deck poll-to-nonpoll transitions; browser projection controls                                     |
| 4 · Destructive cloud revisit      | Persistent per-slide rounds and separate questions; approved findings survive queue dismissal · `55b98dc`, `842fe19`, `8a642bd`                      | Real Worker switch, revisit, resume, Done and lecture-reset tests                                      |
| 5 · Builder targets controller     | Reject controller/ancestor paths; require reviewed starter ancestry and dev command · `e8490da`                                                      | Controller and unrelated directory rejection; rehearsal setup and bridge tests                         |
| 6 · Failed build cannot retry      | Recorded lifecycle, explicit retry with original inputs; labeled prepared views for four checkpoints · `c3bcca1`, `732e622`, `da02e04`               | Browser failure/retry; native form with JS disabled; replacement and independent-view refresh          |
| 7 · Inaccurate privacy promise     | Explain review, projection, model use and separate retention before submission · `c7df698`                                                           | Real student form and moderation flow                                                                  |
| 8 · Anonymous vote inflation       | 300 fresh identities/network/minute and 1,000 voters/room; updates remain allowed; informal-count disclosure · `b726155`                             | Bounded local 301st-admission rejection and existing-voter update                                      |
| 9 · Oversized summaries            | Deduplicate/count; top 20 prompt terms, at most 12 projected findings across four sources; static prompt budget and reference validation · `e592cc7` | 500-response collections remain bounded; misspelled cloud references rejected                          |
| 10 · Deployment incompatibility    | Public capabilities, readiness at lecture load/activation, protocol/room smoke check · `de92fd8`                                                     | Stale/missing capability tests and real public endpoint test                                           |
| 11 · Missing system rehearsal      | Actual deck through local studio and disposable real Worker · `d9e61ed`                                                                              | Every poll/cloud, close/revisit/resume, approved build inputs, failed-build retry and checkpoints      |
| 12 · Outcomes and assessment       | Three observable outcomes; separate audience recap and course-booking transfer problem · `507720b`                                                   | Graph/dependency validation; visible problem and presenter answer guide                                |
| 13 · Conflated failures            | Prepared executable no-send and post-write/drop experiments; inspect actual isolated server state · `5b50801`                                        | Browser observes zero vs one stored submission; request identity handles transport retries             |
| 14 · Inspection before app         | Future-tense survey introduction, embedded inspection previews, POST/303/GET contract alignment · `c75f36f`                                          | Real-deck graph and checkpoint tests                                                                   |
| 15 · Composition leap              | Architecture map; input/output/action/validation/fallback boundary before Future launch; same-task comparison · `651aa4b`, `4314485`                 | Deck graph and bounded prompt validation                                                               |
| 16 · Pacing and vague influence    | Merge four repeated slides; optional cuts; 80 minutes content plus 10 recovery; priority chooses first acceptance test · `a77300e`                   | Deck validation; current run-of-show with stable IDs                                                   |
| 17 · Asset and documentation drift | Licensed Mundaneum cache, captions on image-only slides, student hypothesis summary, canonical operator guide · `968611e`                            | Packaged image and summary served locally and by Worker; remote-blocked slide check; visual inspection |

## Quality gate

Visual checks at 1280 × 720 also confirmed the outcomes, architecture map, runtime contract, transfer problem and failure diagram fit the projected slide.

The complete gate passes **56 unit/integration tests and 35 browser tests**, plus formatting, both TypeScript projects, lint, architecture boundaries, dependency audits and the Worker dry build. Tests use disposable local services and generated fixture credentials. They do not modify production lecture state.

## What remains a delivery judgment

- The 90-minute schedule is a proposed budget. A full spoken rehearsal with live moderation and real remote-model build durations has not been measured.
- The implementation agent is stubbed in the system test. Prepared recovery views are explicit references, not evidence that a live generation succeeded. The Future reference demonstrates deterministic fallback without calling a runtime model.
- Anonymous votes remain informal participation signals; fresh identities below the rate limit are still possible.
- Only the expressly licensed Mundaneum photograph is redistributed. Other archive images retain remote source links and explanatory captions; no blanket redistribution permission is assumed. See [asset credits](../../public/lecture-assets/README.md).
- Commits are local for review. The audience Worker must be deployed before using this studio release with public Live. No push or production deployment was performed during this implementation pass.

Start a follow-up review with the [operator guide](../operator-guide.md), [run of show](../../LECTURE-NARRATIVE.md), and the [exported lecture](../presentations/web-development-2026.md).
