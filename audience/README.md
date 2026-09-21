# Public lecture companion

This Worker is separate from the local studio and the live-built seminar app. The root URL follows the published stage. An open predefined poll temporarily replaces the student view; closing it returns students to the latest stage. The lecturer independently chooses Project question, Project results, or another slide. Bundled legacy rooms and rooms explicitly prepared from Obsidian are available.

Only published slide content, its theme, public presentation identity, and generic build progress are synchronized. Private Obsidian notes, unshown slides, model output, workspace paths and presenter credentials stay local. A local-only app preview becomes a message to follow the projector; a public HTTPS app can be embedded. Student voting uses the same stable root URL. Results remain a lecturer-controlled reveal, not part of the student form.

The build copies the actual stage renderer, stylesheet, and Mermaid runtime into an allowlisted generated asset directory. The desk is never deployed. StageState stores the last published stage separately from vote counts; migration v2 adds that store without resetting rooms. If the local studio disconnects, the last published stage remains available.

The room-state, room-http, and room-view modules were reused from the prepared room kit in the local webdev-through-ages lecture-start-v10 checkout. The lecture implementation checkout remains untouched. Cookie-based replacement is convenience-level deduplication, not strong protection against determined repeat voters.

Install the pinned deployment tool with npm ci in this directory. Deploy only with an explicitly verified dedicated Worker name and account. Keep deployment identity and secrets under the studio's ignored .local directory. Use Wrangler --secrets-file; never place tokens in source, URLs, or command arguments.

Authenticated POST /presenter/rooms/{id}/prepare validates and stores the Obsidian poll definition without deployment. Changed definitions are refused while voting is open or votes exist. POST /presenter/rooms/{id}/seed initializes only empty legacy rooms; open and lock control voting. There is no public reset route. All rooms initially start locked. Public POST forms retain same-origin checks, bounded bodies, predefined-choice validation, and anonymous replaceable votes.

After deployment, configure LECTURE_POLL_ORIGIN and LECTURE_POLL_TOKEN in the local studio's ignored .env and restart it. Loading an Obsidian presentation prepares its declared room IDs and definitions. Do not expose the studio to the internet.

## Current verification

The dedicated rehearsal was deployed on 2026-09-09. Its identity/version is saved in ignored .local/audience/deployment.json. The three rooms are initialized. Their live status/counts must be checked rather than assumed. The studio .env is configured.

Local HTTP checks cover allowlisted rooms, auth, origin rejection, vote replacement, seed idempotence and locking. A real local browser verifies native form submission. The first public smoke submission was rejected with HTTP 403 because a no-referrer policy stripped its origin. The fix uses same-origin and was deployed; a read-only public check confirms the corrected header. No second public vote was sent. Public end-to-end submission and prompt-impact verification remain pending a manual test or explicit retry authorization.

Run `npm run test:browser -- browser-tests/audience.spec.ts` from the repository root.
Each test starts an isolated Worker with real SQLite-backed Durable Objects, generated
credentials, random ports, and no persisted data. CI runs the same tests. They cover
all three rooms, JavaScript-disabled native submission, same-browser replacement,
lecture-session reset/retry, stage following, privacy filtering, retained selection,
feedback moderation and submission limits. No local secret files or deployed
resources are needed. `verify-deployed.ts` remains a separate, deliberate public
smoke test that records each attempt; do not delete its receipt to retry.
`connect-studio.ts` saves private configuration without printing secrets.

The pinned Wrangler development dependency currently reports three high-severity advisories through Miniflare's sharp image-decoder dependency. No image decoding is used here, and that dependency is not bundled into the deployed Worker. Do not use this dev toolchain to process untrusted images; dependency remediation remains a tooling follow-up.

The current Worker includes private question reply emails and moderation statuses.
Public feedback responses contain collection metadata only. Private question/email
rows share the existing 24-hour expiry and lecture-reset deletion. The presenter
can export selected follow-ups locally; the Worker does not send email.
