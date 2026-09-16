export const audienceRooms: Record<
  string,
  { question: string; choices: { id: string; label: string }[] }
> = {
  "webdev-2026-practice": {
    question: "Practice vote: which drink would you pick?",
    choices: [
      { id: "coffee", label: "Coffee" },
      { id: "tea", label: "Tea" },
      { id: "water", label: "Water" },
    ],
  },
  "webdev-2026-friction": {
    question: "What feels unnecessarily difficult on the web?",
    choices: [
      { id: "finding", label: "Finding information" },
      { id: "repeating", label: "Repeating information" },
      { id: "navigation", label: "Navigating interfaces" },
      { id: "trust", label: "Knowing what to trust" },
    ],
  },
  "webdev-2026": {
    question: "Which visual theme should shape our app?",
    choices: [
      { id: "editorial", label: "Editorial" },
      { id: "retro-web", label: "Retro web" },
      { id: "playful", label: "Playful" },
    ],
  },
  "webdev-2026-interaction": {
    question: "Which interaction improvement should we prioritize?",
    choices: [
      { id: "confirmation", label: "Clear submission feedback" },
      { id: "preserve", label: "Keep my unsent choice" },
      { id: "updates", label: "Keep shared results up to date" },
    ],
  },
  "webdev-2026-priority": {
    question: "What should the seminar view prioritize?",
    choices: [
      { id: "overview", label: "Quick overview" },
      { id: "learning", label: "Learning outcomes" },
      { id: "practical", label: "Practical details" },
    ],
  },
};
