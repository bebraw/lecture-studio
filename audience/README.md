# Public lecture companion

This Worker is separate from the local studio and the live-built seminar app. The root URL follows the published stage. An open predefined poll temporarily replaces the student view; closing it returns students to the latest stage. The lecturer independently chooses Project question, Project results, or another slide. Three room IDs remain allowlisted.

Only published slide content, its theme, and generic build progress are synchronized. Private Obsidian notes, unshown slides, model output, workspace paths and presenter credentials stay local. A local-only app preview becomes a message to follow the projector; a public HTTPS app can be embedded. Student voting uses the same stable root URL. Results remain a lecturer-controlled reveal, not part of the student form.

The build copies the actual stage renderer, stylesheet, and Mermaid runtime into an allowlisted generated asset directory. The desk is never deployed. StageState stores the last published stage separately from vote counts; migration v2 adds that store without resetting rooms. If the local studio disconnects, the last published stage remains available.

The room-state, room-http, and room-view modules were reused from the prepared room kit in the local webdev-through-ages lecture-start-v10 checkout. The lecture implementation checkout remains untouched. Cookie-based replacement is convenience-level deduplication, not strong protection against determined repeat voters.

Install the pinned deployment tool with npm ci in this directory. Deploy only with an explicitly verified dedicated Worker name and account. Keep deployment identity and secrets under the studio's ignored .local directory. Use Wrangler --secrets-file; never place tokens in source, URLs, or command arguments.

Authenticated POST /presenter/rooms/{id}/seed initializes only empty rooms; open and lock control voting. There is no public reset route. All rooms initially start locked. Public POST forms retain same-origin checks, bounded bodies, predefined-choice validation, and anonymous replaceable votes.

After deployment, configure LECTURE_POLL_ORIGIN and LECTURE_POLL_TOKEN in the local studio's ignored .env and restart it. The three room IDs and labels match AUDIENCE-VOTES.md. Do not expose the studio to the internet.

## Current verification

The dedicated rehearsal was deployed on 2026-09-09. Its identity/version is saved in ignored .local/audience/deployment.json. The three rooms are initialized. Their live status/counts must be checked rather than assumed. The studio .env is configured.

Local HTTP checks cover allowlisted rooms, auth, origin rejection, vote replacement, seed idempotence and locking. A real local browser verifies native form submission. The first public smoke submission was rejected with HTTP 403 because a no-referrer policy stripped its origin. The fix uses same-origin and was deployed; a read-only public check confirms the corrected header. No second public vote was sent. Public end-to-end submission and prompt-impact verification remain pending a manual test or explicit retry authorization.

Run check-local.mjs and check-browser.mjs only against the hardcoded local test port 8796. verify-deployed.mjs records a public attempt before submitting and refuses to repeat an existing attempt; do not delete that receipt to retry. connect-studio.mjs saves private configuration without printing secrets.

check-stage.mjs tests stage following, privacy filtering, independent voting, preserved form selection, native cookie-backed submission, and return to stage at mobile size. It only mutates the isolated local runtime. The studio unit suite also verifies that private navigation does not broadcast and poll refresh does not replace an unrelated projection.

The pinned Wrangler development dependency currently reports three high-severity advisories through Miniflare's sharp image-decoder dependency. No image decoding is used here, and that dependency is not bundled into the deployed Worker. Do not use this dev toolchain to process untrusted images; dependency remediation remains a tooling follow-up.
