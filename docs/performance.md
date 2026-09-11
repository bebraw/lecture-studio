# Performance measurements

Run `npm run lighthouse` after installing dependencies in both packages and
`npx playwright install chromium`. It starts the real local studio with fake
Obsidian/Codex adapters and an ephemeral local audience Worker, publishes fixed
sample content, then measures each page three times with fresh Chromium profiles.
No production votes, services, private lecture content, or credentials are used.

Reports live in ignored `reports/performance/`: JSON and HTML per run, plus
`summary.json` with each metric's median and all individual runs. The audience
uses Lighthouse's mobile defaults; the stage uses a 1920×1080 desktop viewport
with the same default simulated network/CPU throttling. These are laboratory
navigation measurements, not real-user INP or production network measurements.

## Initial baseline

Measured 2026-09-11 on macOS, Node 26.8.2, Lighthouse 13.4.1 and the repository's
Playwright Chromium. Three-run medians for a text/list material slide:

| Page     |     LCP |     CLS |  TBT |  Transferred |
| -------- | ------: | ------: | ---: | -----------: |
| Audience | 1221 ms |       0 | 0 ms | 16,996 bytes |
| Stage    | 1351 ms | 0.00028 | 0 ms | 59,676 bytes |

`performance-budgets.json` sets initial ceilings with room for ordinary variation:
2.0/2.2 seconds LCP, 0.05 CLS, 100 ms TBT, and 22,000/75,000 transferred bytes
for audience/stage respectively. Review regressions rather than automatically
raising these ceilings. Heavy diagrams, images and embedded apps need separate
representative scenarios; this baseline does not cover them.

The normal command reports budget breaches without failing. To opt into failure
on breaches, run `npm run lighthouse:check`; it always takes fresh measurements.
Both modes fail on missing metrics or failed audits. Performance remains outside
the fast hook and deployment gate until repeated CI measurements establish
appropriate thresholds for that environment.

For interpretation, see [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
