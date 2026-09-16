# Operating this lecture

This is the canonical operator guide. [Run of show](../LECTURE-NARRATIVE.md) supplies timing; the Obsidian presentation and [export](presentations/web-development-2026.md) supply content.

## Before students arrive

1. Start the studio and open `/debug` to compare Desk, Stage and Live. Keep Desk private.
2. Create **New rehearsal** before students arrive. It verifies the pinned starter and installs dependencies. Load the slides afterwards: the first **Live on** reuses this unused checkout and connects Codex. Starting a build consumes its unused status; a later new lecture still gets a fresh project. The studio checkout and its parents are rejected as builder workspaces.
3. Load the Obsidian presentation. Read the audience readiness indicator. Deploy the matching Worker before presenting if it reports incompatibility. Deployment checks `/api/capabilities` and required poll rooms.
4. Check all app checkpoints, the local failure experiment, and remote historical images. The Mundaneum photograph is packaged; other archival images have visible explanatory captions if unavailable. See [asset credits](../public/lecture-assets/README.md).
5. Run `npm run check`. The real-deck test uses disposable Workers and a stub implementation agent. Rehearse real build durations separately; record actual timings in the run of show.

## During the lecture

- **Live on** at the start of a newly loaded/reset lecture clears prior votes and collections before opening the current activity. Off/on within the same lecture resumes it; it does not erase findings. To start a new lecture, use **Reset lecture** or reload while off.
- Moving onto a poll opens it automatically. Leaving closes it and freezes its decision. Returning shows the saved result; explicitly reopening is a new collection of votes for that decision.
- Word-cloud slides open automatically. Returning reopens the same collection. Approved findings are saved separately from the review queue; **Done** dismisses an item without erasing its already-approved contribution. A new lecture clears both. Approve responses before they can appear in a cloud or dependent build prompt. **Show approved cloud** projects a reviewed snapshot. **Back to slide** restores the slide.
- Questions and each slide cloud retain separate collections. Closing stops submissions without deleting responses. Use a new lecture for a complete reset.
- **Live off** closes active voting and collection, then confirms the waiting screen. If delivery fails, the desk reports the failure instead of pretending the transition succeeded.
- Navigation never starts implementation. Review the resolved prompt, then **Start this build**. Failed/interrupted builds expose **Retry this build**, preserving that attempt’s original inputs.
- Demo builds use Codex **low** (light) reasoning, scoped to the studio builder; personal Codex settings stay unchanged. During the lecture, verify TypeScript changes, changed behavior and one browser interaction, with the audience-selected test first. Reuse installed dependencies and the running preview. Full coverage, audits, capability verification, mutation tests, Lighthouse and broad CI are deferred unless needed to diagnose a failure. Keep validation, authorization, privacy and native form behavior intact. A demo-ready result is not release-ready: run the starter’s full quality gate afterwards and before deployment.
- App checkpoints open the captured app preview automatically. If no preview was captured, the four lecture builds open clearly labeled prepared reference views. These are local-only, volatile examples; public Live follows the projector. Direct recovery URLs are `/teaching/checkpoint/build-document`, `/teaching/checkpoint/build-forms`, `/teaching/checkpoint/build-application`, and `/teaching/checkpoint/build-agents`. The Future reference demonstrates the fixed fallback without a runtime model call. Do not treat a preview URL or a completed turn as proof that tests passed. Run the vote-selected test first and report the observation.

## Failure experiment

The prepared local experiment opens directly on its slide. Predict, run A, inspect, reset, then run B and inspect. A sends no POST. B stores a request ID and drops the response connection. Duplicate transport attempts use the same ID. Storage is isolated and volatile; this establishes the two failure cases, not the generated app’s behavior. Public Live may instruct students to follow the projector for this local-only experiment.

## Disclosure and limits

Pending responses are private. Approved words may be projected and included as data in explicitly launched model builds. Queue expiry is 24 hours; saved projections, model conversations and generated artifacts have separate retention. Never solicit names or sensitive data.

Vote counts are informal browser participation signals. Shared-network admission limits deter flooding without claiming one-person identity. A lecture reset removes votes and feedback; it does not delete builder workspace files or model conversations.

## Deployment order

Deploy the Worker before running a studio release that requires its protocol. `main` runs checks, deploys, then verifies public capabilities without changing lecture state. After a protocol-breaking change, keep the lecturer on the prior local release until the deployment smoke check succeeds.

## Demo embedding

New rehearsals include a Studio-owned `src/lecture-preview.ts` entry adapter and `src/lecture-preview-policy.ts`. They preserve the starter implementation and permit loopback HTTP previews to be framed by local Studio origins and `https://live.scalableweb.dev`. Other CSP directives remain intact; public deployment responses keep the original framing policy. Keep this adapter when extending the demo. This does not make a local preview remotely reachable: Live still needs the preview tunnel.
