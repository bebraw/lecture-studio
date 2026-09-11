# Technical stabilization

Keep the local Node presenter service and Cloudflare audience Worker separate.
Migrate runtime code, browser code, tooling, and tests to strict TypeScript.
Preserve lecture behavior while introducing typed contracts and explicit lifecycles.

## Test baseline

The retired build-slides, narrative-votes, poll, studio, and explore browser suites
targeted the superseded Prepare/Present UI and hidden original-lecture controls.
Current coverage uses the presentation workflow, including explicit build launch,
frozen vote inputs, privacy, feedback moderation, navigation, and slide layout.
The deployment workflow runs the entire current browser suite.

## TypeScript migration

All maintained JavaScript sources are now TypeScript, including browser tests and
local deployment tools. Node and browser code share lecture contracts; the Worker
has its own runtime configuration and generated Cloudflare bindings. Browser assets
are compiled with esbuild; the local service runs through the tsx loader.

Validation: strict checks, 32 unit/integration tests, and all 12 browser tests pass.

## Quality gates

Use the template's separate fast and full checks with the existing Node test runner.
The fast gate checks formatting, both strict TypeScript environments, unit/integration
behavior, and production dependency advisories. The full gate adds a Worker dry run
and all browser tests. Local pre-push checks and CI use these same scripts.

The local API reads JSON into unknown-valued records and validates command fields
before use. Its transport reader is separate from lecture orchestration. Invalid
build/approval payloads have regression coverage. No framework or test-runner rewrite
is required for this baseline.

## Codebase diagnostics

Fallow is advisory. Run `diagnostics:codebase`, `diagnostics:health`, and
`diagnostics:map` to inspect dead code, complexity, and `.fallow/codebase-map.html`.
Its first pass removed five unnecessary exports and identified duplicate poll
construction, now shared by projection and voting. Large orchestration functions
remain refactoring candidates; health scores are evidence, not acceptance criteria.
Explicit entries cover built browser assets and local verification tools. Generated
URLs are excluded from unresolved-import findings. Cloudflare RPC methods and
interface-injected adapters remain advisory: static analysis cannot establish all
of their callers. They must not be deleted based on an unused-member report.

## Branch coverage

`npm run test:coverage` generates HTML, LCOV and JSON reports under
`reports/coverage` and enforces 80% lines, 75% branches and 85% functions.
The measured scope is local runtime code (`server.ts`, `lib`, shared error helpers),
including unloaded files. Type-only contracts have no executable coverage.
Browser behavior is checked separately by Playwright; this report does not claim
Worker or browser coverage. Initial measured result after transport fixes: 85.24%
lines, 75.35% branches, 91.74% functions across 36 tests.

## Runtime architecture boundaries

`npm run quality:architecture` enforces Fallow zones for the browser, local Node
service, Cloudflare Worker and shared contracts. Runtime imports cannot cross from
browser to server or Worker, nor between local and Worker runtimes. Shared API
contracts may derive local types through erased type-only imports. Diagnostics
remain advisory; forbidden imports alone block this gate. A deliberately injected
browser-to-server import was rejected, then removed before committing.

## Mutation testing

Stryker uses the TAP runner with the existing Node tests and TypeScript checker.
The full scope is `lib/audience-poll.ts`, `lib/audience-stage.ts`,
`lib/presentation.ts`, `lib/feedback.ts`, and `audience/room-state.ts`.
The initial score was 48.70%; stronger validation/privacy/vote assertions raised it
to 70.57% (voting store: 80.92%). The enforced floor is 70%. No mutation categories
were excluded to increase this score. The report retains 284 surviving and 23
uncovered mutants for follow-up, including message/content changes and remaining
validation cases; compile-error mutants are filtered by the TypeScript checker.

`npm run mutation` runs a fresh full pass. `mutation:incremental` is opt-in locally.
Local concurrency uses 50% of available parallelism. CI runs mutation separately
from the deployment and pre-push gates and retains the HTML/JSON reports for 14 days.
The TAP runner measures coverage per test file and has limited static-mutant
coverage; this is a targeted assertion-strength signal, not a proof of correctness.
Final local runtime coverage: 86.25% lines, 81.12% branches, 92.66% functions;
44 unit/integration tests and 12 browser tests pass.
