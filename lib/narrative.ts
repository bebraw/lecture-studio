interface Act {
  id: string;
  era: string;
  time: string;
  title: string;
  question: string;
  note: string;
  transition: string;
  brief: string;
}
import type { Draft } from "../shared/models.ts";
export const scope = "Lectures";
export const acts: [Act, ...Act[]] = [
  {
    id: "opening",
    era: "Opening",
    time: "00–12",
    title: "Who is the interface for?",
    question: "What is the oldest version of the web you remember using?",
    note: "Interactions/Opening pulse.md",
    transition: "One capability. Three ways to experience it.",
    brief:
      "Show our opening defaults and ask what we want to change. Explain what is already prepared. Do not implement yet.",
  },
  {
    id: "document",
    era: "01 · Documents",
    time: "12–24",
    title: "The web gives things an address.",
    question: "What survives if we remove the styling and scripts?",
    note: "Concepts/01 Web as hypermedia.md",
    transition: "Links let us move. Forms let us act.",
    brief:
      "Build Document A: a readable SDLCAI seminar document with our chosen defaults and real links. Show a local preview, finish the relevant checks, and stop before the form.",
  },
  {
    id: "forms",
    era: "01 → 02 · Enhancement",
    time: "24–38",
    title: "Keep the capability. Add the convenience.",
    question: "Can everyone still vote with JavaScript switched off?",
    note: "Concepts/03 Progressive enhancement.md",
    transition: "The browser can now do more without making the core do less.",
    brief:
      "Build Document B using our prepared room backend. Add a labeled native choice form and aggregate response. Verify it without JavaScript. Do not deploy until I request it. Stop before browser enhancement.",
  },
  {
    id: "application",
    era: "02 · Applications",
    time: "38–58",
    title: "One room. A shared state.",
    question: "What does faster feedback add—and what does it hide?",
    note: "Concepts/04 Browser as application runtime.md",
    transition:
      "People can see the interface. What can another client discover?",
    brief:
      "Advance to Present. Enhance the same form and let the projected view receive aggregate changes. Preserve native submission. Verify in two browser contexts and stop before model composition.",
  },
  {
    id: "agents",
    era: "03 · Agents",
    time: "58–76",
    title: "Two futures can coexist.",
    question:
      "Does the agent need a separate interface, or clearer affordances?",
    note: "Concepts/06 Two agentic directions.md",
    transition:
      "Personalization makes the next question unavoidable: whose context?",
    brief:
      "Advance to Future under our composition contract. Reuse the reviewed material and locked aggregate revision. Show the context receipt and deterministic fallback. Do not widen model authority or deploy unless requested.",
  },
  {
    id: "context",
    era: "03 · Context",
    time: "76–83",
    title: "What went where?",
    question: "Which context would you keep on your own device?",
    note: "Concepts/08 Context, privacy, and receipts.md",
    transition:
      "Return to the opening question, now with more than one kind of user.",
    brief:
      "Explain what context our composition sends, what stays local, and how we verify the result. Do not implement changes.",
  },
  {
    id: "synthesis",
    era: "Return",
    time: "83–90+",
    title: "Who can use what we built?",
    question: "Where does this hypothesis break down?",
    note: "Concepts/09 Synthesis.md",
    transition: "A real next action, and room for disagreement.",
    brief:
      "Summarize the capability preserved across all three ages and the remaining limitations. Do not change the app.",
  },
];
export const initialDraft = (): Draft => ({
  act: "opening",
  mode: "question",
  title: acts[0].title,
  body: acts[0].question,
  source: "",
  diagram: "ages",
  demoUrl: "",
  allowRemoteImages: false,
});
