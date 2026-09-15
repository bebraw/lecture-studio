import { query } from "./dom.ts";
const browser = query("#browser-evidence", document);
const server = query("#server-evidence", document);
query("#before", document).onclick = () => {
  browser.textContent =
    "Transport disabled: no request sent. No confirmation received.";
  server.textContent = "Server state not inspected.";
};
query("#after", document).onclick = async () => {
  browser.textContent = "Submitting…";
  server.textContent = "Server state not inspected.";
  try {
    await fetch("/teaching/record", {
      method: "POST",
      headers: { "x-experiment-id": crypto.randomUUID() },
    });
    browser.textContent = "Unexpected response: check the experiment setup.";
  } catch {
    browser.textContent =
      "Connection lost: no confirmation received. Outcome unknown to this browser.";
  }
};
query("#inspect", document).onclick = async () => {
  try {
    const response = await fetch("/teaching/record", { cache: "no-store" });
    server.textContent =
      "Confirmed stored submissions: " + (await response.text());
  } catch {
    server.textContent = "Cannot inspect the server right now.";
  }
};
query("#reset", document).onclick = async () => {
  await fetch("/teaching/record/reset", { method: "POST" });
  browser.textContent = "Experiment reset.";
  server.textContent = "Confirmed stored submissions: 0";
};
