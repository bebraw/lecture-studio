# Narrative audience votes

The studio uses three separate, pre-provisioned rooms under LECTURE_POLL_ORIGIN, authenticated with LECTURE_POLL_TOKEN for presenter actions. With the default LECTURE_POLL_ROOM=webdev-2026:

| Slide                               | Room                 | Exact option IDs and labels                                                                                                     | Default   |
| ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Opening frustration                 | webdev-2026-friction | finding: Finding information; repeating: Repeating information; navigation: Navigating interfaces; trust: Knowing what to trust | finding   |
| Visual theme, before Document A     | webdev-2026          | editorial: Editorial; retro-web: Retro web; playful: Playful                                                                    | editorial |
| Priority, before Future composition | webdev-2026-priority | overview: Quick overview; learning: Learning outcomes; practical: Practical details                                             | overview  |

The public app must expose these rooms and matching option labels before rehearsal. The studio checks them before opening or locking; it validates options before opening. Each new lecture clears a room’s previous votes on its first open; reopening within that lecture preserves votes.

Navigate to a vote slide, then Open voting. Close voting and continue locks the room, records a deterministic winner (including explicit tie/no-vote fallback), and advances. The slide shows aggregate counts and the join URL. It does not generate a QR code.

Frozen friction and theme decisions automatically become concrete requirements in every subsequent build-slide prompt. Future composition additionally includes the priority decision. For example, repeating information preserves form choices; trust requires attribution; a learning priority foregrounds supported learning outcomes. Prompts include the selected option, revision, total and selection reason. No votes are sent to the agent as executable instructions.

Without a frozen result, the prompt explicitly retains the prepared project default and does not claim audience endorsement. Builds still require Start this build. Frozen rounds survive navigation in server memory, but not a server restart or lecture reset. Resetting the lecture or loading/restarting a presentation creates a new voting session. Each room clears its old counts atomically when first opened in that session. Server restarts also start a new session. The audience Worker must be deployed with open-session support.

Restart the studio after updating the server and supplying the room environment variables.
