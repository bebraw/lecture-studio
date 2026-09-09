# Public rehearsal voting

This Worker is separate from the local studio and the live-built seminar app. It exposes only three allowlisted, predefined polls. No Obsidian content, model endpoint, private studio URL, or presenter token is sent to participants.

The room-state, room-http, and room-view modules were reused from the prepared room kit in the local webdev-through-ages lecture-start-v10 checkout. The lecture implementation checkout remains untouched. Cookie-based replacement is convenience-level deduplication, not strong protection against determined repeat voters.

Install the pinned deployment tool with npm ci in this directory. Deploy only with an explicitly verified dedicated Worker name and account. Keep deployment identity and secrets under the studio's ignored .local directory. Use Wrangler --secrets-file; never place tokens in source, URLs, or command arguments.

Authenticated POST /presenter/rooms/{id}/seed initializes only empty rooms; open and lock control voting. There is no public reset route. All rooms initially start locked. Public POST forms retain same-origin checks, bounded bodies, predefined-choice validation, and anonymous replaceable votes.

After deployment, configure LECTURE_POLL_ORIGIN and LECTURE_POLL_TOKEN in the local studio's ignored .env and restart it. The three room IDs and labels match AUDIENCE-VOTES.md. Do not expose the studio to the internet.

## Current verification

The dedicated rehearsal was deployed on 2026-09-09. Its identity/version is saved in ignored .local/audience/deployment.json. The three rooms are initialized, locked, and contain zero votes. The studio .env is configured.

Local HTTP checks cover allowlisted rooms, auth, origin rejection, vote replacement, seed idempotence and locking. A real local browser verifies native form submission. The first public smoke submission was rejected with HTTP 403 because a no-referrer policy stripped its origin. The fix uses same-origin and was deployed; a read-only public check confirms the corrected header. No second public vote was sent. Public end-to-end submission and prompt-impact verification remain pending a manual test or explicit retry authorization.

Run check-local.mjs and check-browser.mjs only against the hardcoded local test port 8796. verify-deployed.mjs records a public attempt before submitting and refuses to repeat an existing attempt; do not delete that receipt to retry. connect-studio.mjs saves private configuration without printing secrets.

The pinned Wrangler development dependency currently reports three high-severity advisories through Miniflare's sharp image-decoder dependency. No image decoding is used here, and that dependency is not bundled into the deployed Worker. Do not use this dev toolchain to process untrusted images; dependency remediation remains a tooling follow-up.
