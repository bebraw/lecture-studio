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
