# Contributing to Gather

Use Node.js 22.13 or later and the committed npm lockfile. Follow the local setup and database migration instructions in README.md. Keep API keys in ignored local configuration; never add secrets or real event data to tests, fixtures or screenshots.

## Check a change

```sh
npm run format
npm run verify
npm audit --omit=dev --audit-level=high
npm run build
```

Start the development server in a separate terminal, then run `npm run test:e2e`. On Linux/CI, install Playwright Chromium and set `PLAYWRIGHT_CHANNEL=chromium`; Windows defaults to Microsoft Edge. `TEST_BASE_URL` selects a production preview or deployed app.

Keep domain rules independent of React and storage. UI components must use the workspace's queued update functions rather than write IndexedDB directly. Preserve exact minor-unit money arithmetic, protected allocations, stored payments and stale-result checks. AI output is untrusted and must pass validation before review or use.

Add a regression test for a bug's observable behavior. Keep the coverage scope explicit; do not describe domain coverage as coverage of every React component. Maintain accessible labels, error descriptions, keyboard focus and mobile controls when changing views. See docs/architecture.md for module responsibilities and docs/security.md for trust boundaries.
