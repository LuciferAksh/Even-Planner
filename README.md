# Gather

A GenAI-assisted planning workspace for weddings, birthdays, and community events. Built for Google Prompt Wars. All six assessment categories are release priorities: code quality, security, efficiency, testing, accessibility, and problem alignment.

## What works

- Separate event templates with budget allocations, preparation tasks, vendor checklists, personalized AI ideas, and an event-day schedule.
- Exact integer money calculations, contingency, paid amounts, protected budget categories, over-budget warnings, and scenario preview/apply/undo.
- Task completion, prerequisites, owners, search, vendor names, quote tracking, and booking status.
- Multiple browser-local events, transactional IndexedDB persistence, conflict detection, validated JSON backups, CSV budgets, all-day ICS deadlines, and printing.
- Optional server-side Gemini personalization. Explicit consent explains what is sent. A missing key or exhausted quota leaves the template fully usable and clearly labeled.

## Run locally

Requires Node.js 22.13+ and npm. Use the committed lockfile.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brief_roughhouse.sql
npm run dev
```

Open the URL printed by the dev server (normally http://127.0.0.1:5173). Apply the SQL migration once to each new local database. Do not replay it on an existing migrated database. For a production-build preview use `npm start` after building; it uses the same local database.

### Enable Gemini

Copy `.env.example` to **`.dev.vars`** in the project root, then set `GEMINI_API_KEY` to your Google AI Studio key. Do not commit this file or paste the key into a frontend component. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`; choose a supported model available to your project's free tier. Restart the development server after changing secrets. For hosted Sites, set the same environment names as secret runtime values through Sites and deploy a new version.

No Gemini key is included in this source. Local live-provider smoke checks passed for all three event types using gemini-3.1-flash-lite. Each new deployment still needs a live integration check. Template mode alone is not evidence of a successful Gemini integration.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
```

Browser tests expect a running server. They use Microsoft Edge by default on Windows. Set `PLAYWRIGHT_CHANNEL=chromium` and install the standard Playwright Chromium browser on Linux/CI. `TEST_BASE_URL` overrides the preview URL. Coverage reports describe domain, provider, request, quota, storage, and export modules; they do not claim full React interaction coverage. Browser tests cover interactions separately. Tests use mock provider responses and fictional events, never real secrets or live free-tier quota.

## Architecture

```text
app/planner/       Accessible UI, dialogs, budget/scenario forms
app/api/generate/  Bounded JSON endpoint; no generic AI proxy
domain/            Schemas and pure money/date/planning functions
server/            Gemini adapter, request validation, durable quota
storage/           IndexedDB repository and validated backup import
exports/           CSV, ICS and JSON serialization
db/, drizzle/      D1 schema and migration for shared AI rate limits
tests/             Domain/integration tests and browser journeys
docs/              Security, evaluation and submission material
```

Vinext provides the React/Next-compatible UI and server routes on Cloudflare Workers. The Sites starter supplies its runtime and build integration. D1 stores only shared AI quota counters; event plans stay in the browser. This is an intentional local-first design, not cross-device account storage. Sites authentication is controlled by the hosting platform. The standalone app does not trust a client-supplied user identity.

## Data and AI boundaries

Only the brief (event type, date, budget, location, guest count, preferences, currency and timezone) goes to Google after the user confirms personalization. Vendor names, quotes, payments and task owners are excluded. Free-tier Gemini content may be used to improve Google's products; use fictional details in demonstrations.

Gemini suggests tasks, ideas, assumptions, and schedule entries using a constrained JSON schema. The server independently validates field lengths, counts, types, times and schedule ordering. Application code owns exact budgets and dates. Templates do not invent businesses or claim verified market prices. Scenario comparisons are deterministic and make no AI call.

## Deployment and submission

The source includes a Sites hosting manifest and D1 migration. Sites publishing applies the hosted schema before uploading the Worker. Production secret values are separate from the manifest and source. Keep new deployments private until access and live Gemini are verified; judges need a reachable deployed URL for submission.

For another Cloudflare account, provision an equivalent D1 binding named `DB`, apply the migration, set Gemini secrets, and adapt the hosting configuration. Do not reuse this project's Sites identity for a different Site. For GitHub publication, push sanitized source and its lockfile; never push `.dev.vars`, `.env*`, `.wrangler`, `node_modules`, coverage, recordings, or build artifacts.

The submission also requires a public GitHub URL, demo video URL, changes description, GenAI usage explanation, and LinkedIn post URL. Drafts and a demonstration script are in `docs/submission.md`. No competition attempt is submitted by running or deploying this project.

## Honest limitations

- No cross-device sync, real vendor search, bookings, payment processing, email sending, or legal/permit verification.
- Template suggestions are generic. Gemini ideas are suggestions, not guarantees of feasibility or vendor availability.
- Calendar exports contain date-only preparation deadlines and the event date. They do not claim to export timezone-aware event-day appointments.
- Clearing browser data removes saved plans. JSON backups are the recovery path.
- The AI endpoint has a shared global rate limit. Free-tier project limits may be lower.
- Automated accessibility scans complement manual keyboard, zoom and assistive-technology checks; they do not establish complete WCAG conformance.

See `docs/evaluation.md` for release checks and actual verification status.
