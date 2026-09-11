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
