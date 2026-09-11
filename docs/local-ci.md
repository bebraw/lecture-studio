# Local GitHub Actions

Install both package lockfiles (`npm ci` and `npm ci --prefix audience`) and
start Docker Desktop, OrbStack, or Docker Engine. Then run `npm run ci:local`.
The pinned `run-local-ci` package is the current name of Agent CI; it executes
the existing `.github/workflows/check.yml` against the working tree, including
uncommitted changes. There is no separate local copy of the workflow.

The workflow installs Node from `.nvmrc`, both dependency trees and Chromium,
then runs `npm run check`: formatting, lint, import boundaries, strict types,
coverage, runtime audits, the Worker dry run and browser tests. Its coverage and browser
diagnostics artifact steps run in the same workflow. It does not deploy and needs no
Cloudflare token. Mutation testing runs locally with `npm run mutation` or
`npm run mutation:incremental`; it is excluded from GitHub Actions because hosted
runs exceeded the 20-minute job limit. Lighthouse remains a separate advisory
measurement.

A failed job is retained for inspection. Use the runner name printed in the log:
`npm run ci:local:retry -- --name <runner-name>`.
The first execution may download the runner image, Node and browser dependencies.
Later executions reuse machine-local caches.

Optional machine settings belong in ignored `.env.local-ci`; see
`.env.local-ci.example`. Standard Docker CLI contexts and Local CI's daemon
selection can differ: set `LOCAL_CI_DOCKER_HOST` if its default socket is wrong.
Do not add production secrets just to run checks, and do not use `--all` here:
this repository also contains a deployment workflow.

Local CI is a useful Linux check before pushing; GitHub's checks remain the
authority for merging and deployment.

Local CI wraps Git for `actions/checkout` and may return a synthetic SHA for
plain `rev-parse HEAD`, even in temporary repositories. Change detection and
its Git fixtures resolve `HEAD^{commit}` to verify the real commit object.
