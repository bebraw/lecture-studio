import type { DeskState } from "../shared/api.ts";

export function mountPollMonitor(host: HTMLElement) {
  const panel = document.createElement("section");
  panel.id = "poll-monitor";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Private live vote results");
  panel.innerHTML =
    '<div class="poll-monitor-heading"><div><span class="section-label">Audience vote · private</span><div class="poll-monitor-total"></div></div><span class="poll-monitor-state"></span></div><p class="poll-monitor-activity" role="status" aria-live="polite" aria-atomic="true"></p><div class="poll-monitor-options"></div><p class="poll-monitor-error" role="status"></p>';
  host.after(panel);
  const total = panel.querySelector<HTMLElement>(".poll-monitor-total")!;
  const status = panel.querySelector<HTMLElement>(".poll-monitor-state")!;
  const activity = panel.querySelector<HTMLElement>(".poll-monitor-activity")!;
  const options = panel.querySelector<HTMLElement>(".poll-monitor-options")!;
  const error = panel.querySelector<HTMLElement>(".poll-monitor-error")!;
  let key = "";
  let signature = "";
  let previous: Map<string, number> | null = null;
  let previousTotal = 0;
  let changedAt = "";
  return (data: DeskState) => {
    const p = data.presentation;
    panel.hidden = p?.step.type !== "poll";
    if (panel.hidden || !p) {
      key = "";
      return;
    }
    const poll = data.graphPoll;
    const nextKey = JSON.stringify([p.loadedAt, p.current, poll?.pollId]);
    if (nextKey !== key) {
      key = nextKey;
      signature = "";
      previous = null;
      previousTotal = 0;
      changedAt = "";
      activity.textContent = "Waiting for votes.";
    }
    const snapshot = poll?.frozen || poll?.snapshot;
    const count = snapshot?.totalVotes || 0;
    const open = data.live && snapshot?.status === "open" && !poll?.frozen;
    status.textContent = poll?.error
      ? "Updates interrupted"
      : open
        ? "Voting open"
        : poll?.frozen
          ? "Voting closed"
          : "Voting paused";
    panel.dataset.open = String(open && !poll?.error);
    error.textContent = poll?.error
      ? "Showing the last received counts. " + poll.error
      : "";
    error.hidden = !poll?.error;
    total.textContent = `${count} ${count === 1 ? "vote" : "votes"}`;
    const choices =
      snapshot?.choices ||
      p.step.poll?.options.map((choice) => ({ ...choice, votes: 0 })) ||
      [];
    const nextSignature = JSON.stringify(choices);
    if (nextSignature === signature) return;
    signature = nextSignature;
    const changes = choices.filter(
      (choice) => previous && previous.get(choice.id) !== choice.votes,
    );
    if (changes.length) {
      changedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const added = count - previousTotal;
      activity.textContent = `${added > 0 ? `+${added} ${added === 1 ? "vote" : "votes"}` : "Votes updated"} · ${changes.map((choice) => `${choice.label}: ${choice.votes}`).join("; ")} · Last change ${changedAt}`;
    } else if (!changedAt) {
      activity.textContent = count
        ? "Current totals · watching for changes."
        : "Waiting for votes.";
    }
    const maximum = Math.max(0, ...choices.map((choice) => choice.votes));
    options.replaceChildren(
      ...choices.map((choice) => {
        const row = document.createElement("div");
        row.className = "poll-monitor-option";
        row.dataset.optionId = choice.id;
        const delta = previous
          ? choice.votes - (previous.get(choice.id) || 0)
          : 0;
        row.classList.toggle("vote-changed", delta !== 0);
        row.classList.toggle(
          "vote-leading",
          maximum > 0 && choice.votes === maximum,
        );
        const label = document.createElement("span");
        label.textContent = choice.label;
        const value = document.createElement("strong");
        const percent = count ? Math.round((choice.votes / count) * 100) : 0;
        value.textContent = `${choice.votes} · ${percent}%`;
        const change = document.createElement("span");
        change.className = "poll-monitor-delta";
        change.textContent = delta ? `${delta > 0 ? "+" : ""}${delta}` : "";
        change.setAttribute(
          "aria-label",
          delta ? `Change: ${delta > 0 ? "+" : ""}${delta} votes` : "",
        );
        const track = document.createElement("div");
        track.className = "poll-monitor-track";
        track.setAttribute("aria-hidden", "true");
        const bar = document.createElement("div");
        bar.style.width = `${percent}%`;
        track.append(bar);
        row.append(label, value, change, track);
        return row;
      }),
    );
    previous = new Map(choices.map((choice) => [choice.id, choice.votes]));
    previousTotal = count;
  };
}
