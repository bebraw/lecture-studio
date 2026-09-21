const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function qaPage(title: string, moderator: boolean) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Q&A</title><link rel="stylesheet" href="/qa.css"><script type="module" src="/qa.mjs"></script></head><body data-moderator="${moderator}"><main><header><p class="eyebrow">${moderator ? "Private moderation" : "Audience questions"}</p><h1>${escape(title)}</h1><p id="collection-status" role="status">Connecting…</p></header><p id="qa-error" role="alert"></p><noscript>Enable JavaScript to submit or moderate questions.</noscript>${
    moderator
      ? `
<form id="qa-login"><label>Moderator key<input id="moderator-key" type="password" autocomplete="off" required maxlength="128"></label><button>Sign in</button><p class="hint">Use the private key supplied by the session organizer.</p></form>
<section id="moderation" hidden><div class="controls"><button id="qa-open">Open questions</button><button id="qa-close">Close questions</button><button id="qa-logout">Sign out</button></div><p id="qa-expiry" class="hint"></p><p><a id="audience-link">Open audience page ↗</a></p><label>Show questions<select id="qa-filter"><option value="pending">Pending</option><option value="shortlist">Shortlisted</option><option value="reply-later">Follow-up</option><option value="answered">Answered</option><option value="dismissed">Dismissed</option><option value="all">All</option></select></label><button id="qa-export">Download follow-ups (.md)</button><div id="qa-items" aria-label="Private question queue"></div></section>`
      : `
<form id="qa-submit"><label>Your question<textarea id="question-text" rows="5" maxlength="400" required aria-describedby="question-help"></textarea></label><p id="question-help" class="hint">Up to 400 characters. Questions are visible only to the moderators.</p><label>Reply email <span class="optional">(optional)</span><input id="question-email" type="email" maxlength="254" autocomplete="email" aria-describedby="email-help"></label><p id="email-help" class="hint">Share an email only if you want a follow-up. It stays private to the moderators.</p><button id="question-send" disabled>Send question</button></form><p id="submission-status" role="status"></p><p class="hint">Collection closes after 24 hours. Questions and reply emails are then deleted. You can also ask aloud.</p>`
  }</main></body></html>`;
}
