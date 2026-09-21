# Hosted Q&A without Studio

A session runs on the audience Worker while the venue presents a PDF. It has its
own audience URL, moderator key and private question queue. It does not require
the local desk, a live slide broadcast, or the speaker's computer.

## Provision a session

Deploy the updated audience Worker once; the `v3` migration adds the
`QuestionSession` Durable Object binding. It preserves existing lecture and poll
objects.

```sh
npm run deploy --prefix audience
```

Configure `LECTURE_POLL_ORIGIN` and `LECTURE_POLL_TOKEN` in your ignored `.env` or
environment, as for the existing audience connection. The token is the Worker's
`PRESENTER_TOKEN`. Then provision a distinct session for each event:

```sh
npm run qa:session -- create ai-day-2026 "AI Day 2026" .local/ai-day-moderator.json
npm run qa:session -- create webist-2026 "WEBIST 2026" .local/webist-moderator.json
```

This command does not start Studio. It prints the public audience and moderator
page URLs and writes the moderator key to a new private file with owner-only
permissions. It refuses to overwrite an existing credential file. The generated
JSON contains `audienceUrl`, `moderatorUrl`, and `moderatorKey`.

Put only the **audience URL** in the slides or their QR code, for example
`https://live.scalableweb.dev/q/ai-day-2026`. Provision sessions ahead of submission;
they remain closed until a moderator opens questions. Share the moderator page
URL and private key directly with the people moderating that session. The master
publishing credential is not needed on their phones.

## During the event

1. Open `/q/ai-day-2026/moderate` on a phone, enter the moderator key, and sign in.
2. Tap **Open questions**. Attendees can submit questions and an optional private
   reply email at `/q/ai-day-2026` while the PDF remains on the venue computer.
3. Filter pending, shortlisted, answered, follow-up or dismissed questions.
   Use **Return to pending** to reverse a moderation decision.
4. Mark questions **Follow-up**, then **Download follow-ups (.md)** before leaving.
   This private download includes the marked questions and any reply addresses.
5. Tap **Close questions**, then **Sign out** when finished.

Incoming questions and reply emails never appear on the public page. Moderation
is private; this feature does not publish a selected question over the venue PDF.
The public page shows collection status and a submission acknowledgement.
Closing and reopening preserves the queue until its original expiry. Turning
Studio Live off or resetting its lecture does not affect a hosted session.

Each collection lasts 24 hours from its first opening. Questions and reply emails
are deleted at expiry; closing does not extend that deadline. Open again after
expiry to start a fresh collection. The session URL and moderator key remain
available for that session. Moderator sign-in lasts eight hours and can be renewed.
The phone needs an internet connection even when the venue's PDF is offline.

## Access and recovery

Hosted pages require HTTPS (HTTP is allowed for localhost testing).
Keys and sign-in cookies are scoped to one session. Cookies are HttpOnly,
SameSite=Strict, and Secure on HTTPS. Keys are not placed in URLs or browser
storage. Sign-in attempts and audience submissions are limited; cross-origin
writes are rejected. A moderator can see private reply addresses and download
follow-ups, but cannot publish slides, reset Studio, or manage other sessions.

To replace a lost or shared key and revoke all existing moderator sign-ins:

```sh
npm run qa:session -- rotate ai-day-2026 "AI Day 2026" .local/ai-day-new-moderator.json
```

Rotation retains the questions and current open/closed state. An existing session
cannot be overwritten by `create`. If setup loses its response or cannot save its
private file after reaching the service, use `rotate` with a new output filename
to establish a known key.

Use a new session ID for a separate event. Public URLs can be shared freely;
moderator keys and follow-up downloads remain private and should stay out of the
Obsidian presentation and publication PDF.
