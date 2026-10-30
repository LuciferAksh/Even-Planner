# Gather

A GenAI-assisted planning workspace for weddings, birthdays, and community events. Built for Google Prompt Wars. All six assessment categories are release priorities: code quality, security, efficiency, testing, accessibility, and problem alignment.

## What works

- Separate event templates with budget allocations, preparation tasks, vendor checklists, personalized AI ideas, and an event-day schedule.
- Exact integer money calculations, contingency, paid amounts, protected budget categories, over-budget warnings, and scenario preview/apply/undo.
- Task completion, prerequisites, owners, search, vendor names, quote tracking, and booking status.
- Multiple browser-local events, transactional IndexedDB persistence, conflict detection, validated JSON backups, CSV budgets, all-day ICS deadlines, and printing.
- Optional server-side Gemini personalization. Explicit consent explains what is sent. A missing key or exhausted quota leaves the template fully usable and clearly labeled.
- An event-aware virtual planning companion beside personalization. Chat through ideas and questions, preview preference/budget/guest/task changes, then explicitly apply them. Conversation history stays with each event in this browser and its JSON backup.

## Talk through your event

Open an event and choose **Chat with Gather** beside **Personalize with AI**. Share your thoughts, ask a follow-up, or request a concrete change. Gather uses the current event summary and recent conversation. Advice does not alter your event. Proposed changes include a preview and an **Apply to my plan** button; budget changes go through the same exact-money and protected-cost checks as scenarios. After applying preferences, **Personalize with these thoughts** opens the existing full-plan personalization flow.

Up to 30 exchanges are saved per event; the most recent 12 messages provide AI context. Starting another exchange expires older unaccepted proposals. Failed or canceled replies preserve the saved conversation, plan, and composer draft. Clearing chat requires confirmation and does not delete the event. Chat and personalization share the global four-requests-per-minute protection and Google's additional project quotas.

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
npm run format:check
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
```

`npm run verify` runs typecheck, zero-warning lint, formatting checks and scoped coverage tests together. TypeScript also rejects unused declarations, incomplete returns and switch fallthrough. Lint enforces limits on application module/function size, complexity and nesting and rejects non-null assertions. The quality release separates workspace persistence, AI requests, task rules, chat review and presentation without adding runtime dependencies. See [architecture and maintenance](docs/architecture.md) and [contributing](CONTRIBUTING.md).

Gemini JSON output contracts are generated from the application validation schemas, with semantic checks retained at runtime. The event capacity limit is checked atomically during creation and import, including across tabs. Existing events remain editable when capacity is reached.

Browser tests expect a running server. They use Microsoft Edge by default on Windows. Set `PLAYWRIGHT_CHANNEL=chromium` and install the standard Playwright Chromium browser on Linux/CI. `TEST_BASE_URL` overrides the preview URL. Coverage reports describe domain, provider, request, quota, storage, and export modules; they do not claim full React interaction coverage. Browser tests cover interactions separately. Tests use mock provider responses and fictional events, never real secrets or live free-tier quota.

## Architecture

```text
app/planner/       Accessible UI, dialogs, budget/scenario forms
app/api/           Bounded chat and personalization endpoints; no generic AI proxy
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

Personalization sends the brief (event type, date, budget, location, guest count, preferences, currency and timezone) to Google after confirmation. Sending a chat message shares that brief, recent messages, budget allocation targets, up to 25 task summaries, and vendor categories/statuses. Vendor names, quotes, payments and task owners are excluded from the event summary. Messages themselves may contain information typed by the user; the interface explains this before sending. Free-tier Gemini content may be used to improve Google's products; use fictional details in demonstrations. JSON backups can include conversation content and are bounded to 32 MB on import.

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
