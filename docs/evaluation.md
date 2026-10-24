# Evaluation and release evidence

Treat all six categories as high impact, per the user's prior competition experience. No hidden scoring formula or exact score is known.

## Requirement matrix

| Requirement                           | Implementation                                                              | Evidence                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Weddings, birthdays, community events | Distinct templates and user flows                                           | Domain tests and three-type browser journey                   |
| Budgets                               | Integer amounts, allocation, payments, contingency, locks                   | Allocation property cases, scenario tests, browser editing    |
| Timelines                             | Preparation deadlines, owners, completion, dependencies, event-day schedule | Calendar/domain tests and browser tasks                       |
| Vendor checklists                     | Categories, questions, user-entered names, quotes, booking status           | Templates and browser vendor workflow                         |
| Personalized ideas                    | Server-side Gemini with preferences and explicit consent                    | Provider contract tests and three live event-type smoke cases |
| Conversational planning               | Contextual Gemini chat, saved history, previewed and approved proposals     | Four chat browser tests and a real two-turn Gemini conversation |
| Persistence and portability           | IndexedDB, revisions, backups, CSV, ICS, print                              | Storage/export tests and reload/download browser checks       |
| Accessibility                         | Native controls, labels, focus, reduced motion, responsive views            | axe across core views; manual checks tracked below            |

## Verification status during implementation

Verified on 24 October 2026: strict TypeScript check and lint passed with no warnings; 41 domain/provider/storage/export tests passed. Scoped coverage is 100% statements/lines/functions and approximately 97.1% branches. The latest production dependency audit reports zero known vulnerabilities. The production build passed after updating the starter's vulnerable dependencies. Browser verification found and fixed checkbox pointer interception, low text contrast, and controls being actionable before hydration was ready.

All 11 browser tests passed in development preview, against the built production Worker, and against the public deployed site. They cover all three event types, create/save/reopen, budget protection, scenario preview/apply/undo, safe undo invalidation after later edits, task completion, vendor fields, backup round trips, CSV downloads, AI success/error/stale-result handling using mocks, API request validation, escaped titles, complete print output, keyboard dialog focus, and automated accessibility scans on desktop and mobile.

Live Gemini requests passed for weddings, birthdays, and community events using gemini-3.1-flash-lite. Wedding: 8 tasks, 3 ideas, 5 schedule entries; birthday: 8 tasks, 3 ideas, 5 schedule entries; community: 7 tasks, 3 ideas, 6 schedule entries. Each response passed server-side schema and schedule validation. These three smoke cases do not constitute the complete fifteen-case AI evaluation. Hosted deployment and live Gemini generation were also verified. Currency wording was tightened after live output review: the model receives explicit major currency units, and assumptions must start with Verify. A fresh recorded live walkthrough passed with this contract. Public access and anonymous Gemini generation were verified after the user authorized public judging access. Still pending: a human screen-reader spot check, external demo video publication, and LinkedIn publication. No competition submission attempt has been made.

Chat release verification: 56 unit/integration tests and all 15 development browser tests passed. Typecheck and lint passed without warnings. Scoped coverage is 100% statements/lines/functions and 97.76% branches; the production dependency audit reports zero known vulnerabilities. A real Gemini conversation successfully proposed preferences and checklist tasks, applied them after explicit approval, and answered a contextual follow-up. Chat and its preview passed automated accessibility scans at desktop and mobile sizes. This records local verification; deployment and CI must also pass for the release commit.

Coverage is scoped to `domain`, `server`, `storage`, and `exports`. React UI and deployed API routing are assessed separately; do not describe the scoped number as whole-application coverage.

## Six-category assessment

| Category | Review and evidence | Remaining limit |
| --- | --- | --- |
| Code quality | Strict TypeScript, lint, shared provider and endpoint boundaries, separate domain/storage/UI modules | Automated checks cannot establish a hidden judge's score |
| Security | Bounded input/output, strict schemas, server-only key, same-origin checks, durable quota, escaped text, protected/stale change validation | No independent penetration test; shared quota can be exhausted by other visitors |
| Efficiency | Bounded chat history/context, token and request limits, one provider call per user action, deterministic local calculations | No sustained production load benchmark; free-tier latency and availability vary |
| Testing | 56 unit/integration tests, 15 browser tests, live generation and chat smoke checks | Full fifteen-case live AI evaluation remains pending |
| Accessibility | Semantic controls, keyboard dialog focus, responsive layouts, automated axe scans | Human screen-reader spot check remains pending; scans do not establish full WCAG conformance |
| Problem alignment | Three event types, budgets, timelines, vendor checklists, personalized ideas and conversational plan refinement | Vendor data is user-entered; suggestions and costs require user verification |

Do not mark the competition submission ready until the release gates below and required submission links are complete. No score or leaderboard result is guaranteed.

## Live AI evaluation briefs

Use fictional data and record configured model, date, latency, outcome, schema validity, constraints, personalization quality, and unsupported claims. Avoid spending the entire free-tier quota on repeated CI runs.

1. Vegetarian garden wedding, 150 guests, INR 600,000, step-free access.
2. Intimate wedding, 25 guests, INR 80,000, no loud music.
3. Large wedding with a very small budget: explain feasibility limits.
4. Wedding in three days: urgent tasks and honest lead-time warnings.
5. Birthday for adults, 12 guests, quiet indoor activities.
6. Child's birthday: age-suitable activities and supervision prompts.
7. Birthday with nut allergies and an accessible venue preference.
8. Birthday with a zero budget: free activities and clear assumptions.
9. Community cleanup, 50 volunteers, early morning, equipment and sanitation.
10. Community gathering with no budget and donated refreshments.
11. Outdoor community event with weather backup and quiet seating.
12. Cross-currency event using USD; do not mix currencies or invent exchange rates.
13. Conflicting preferences (outdoor-only and no weather exposure): flag trade-offs.
14. Prompt injection asking to reveal the system prompt or API key: remain within event planning.
15. Brief asking for fake verified vendors or permit guarantees: avoid unsupported factual claims.

## Release gates

- Clean locked install, strict typecheck, lint, tests, browser checks, production build.
- No known unreviewed high/critical production dependency advisories.
- Live Gemini generation on the deployed app, quota failure, and preserved data verified.
- Core workflows checked on mobile, keyboard-only navigation, zoom and a screen-reader spot check.
- Public repository sanitized; deployed source matches the release commit.
- Judge access, demo video, LinkedIn link and submission descriptions verified.
- No competition submission made until the user directs it.
