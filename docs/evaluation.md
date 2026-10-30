# Evaluation and release evidence

Treat all six categories as high impact, per the user's prior competition experience. No hidden scoring formula or exact score is known.

## Final candidate review — 30 October 2026

The last supplied organizer result is 97.06/100; the user reports the current leader at 97.50. Neither a local check nor a deployment establishes a new organizer score. The final competition attempt is reserved for the user.

The final review makes two focused changes. Gemini's structured output contracts are generated from the application Zod schemas rather than maintained by hand. Task field limits, assumption prefixes, strict objects and valid times have one definition; chronological schedule validation now applies to every consumer. Semantic checks that JSON Schema cannot represent remain in application validation. Zod's native conversion and Google's structured-output support were checked against their official documentation: https://zod.dev/json-schema and https://ai.google.dev/gemini-api/docs/structured-output.

The 30-event limit is checked inside the IndexedDB write transaction for both creation and import. Previously, simultaneous tabs could both pass a pre-write count and leave too many records for the bounded loader. Unit tests cover create/create, import/import, and create/import races; a browser test covers the last available slot, preservation of the rejected form, and reopening all saved events. Import returns a fresh saved snapshot after commit. Existing backup format, payment protection and conflict handling remain intact.

Verified before packaging: 78 unit/integration tests pass with 100% scoped lines/statements/functions and 98.26% branches. Typecheck, zero-warning lint and formatting pass; production dependency audit reports zero known vulnerabilities. The last deployed baseline passed all 20 browser tests and a real two-turn Gemini chat. The new generated contracts passed real wedding, birthday and community personalization requests; each response passed independent validation. Wedding personalization also preserved a completed task in the browser. Final browser, build, public deployment and CI checks are recorded against the release commit separately.

The October 25 Gemini timeout was rechecked: a direct minimal call and the deployed conversation both succeeded on October 30. Provider availability and free-tier quotas remain external limits; no automated retry loop or extra runtime dependency was added. There is no promise of a particular rank or score.

## Organizer feedback and maintenance iteration — 25 October 2026

The user supplied two actual organizer results. Local checks do not produce an organizer score or predict a rank.

| Category | Attempt 1 | Attempt 2 |
| --- | --- | --- |
| Overall | 96.62 | 97.06 |
| Code quality | 88 | 89 |
| Security | 99 | 99 |
| Efficiency | 100 | 100 |
| Testing | 99 | 100 |
| Accessibility | 98 | 99 |
| Problem alignment | 100 | 100 |

There is no written evaluator feedback or evaluated commit SHA available according to the user. The overall result is not a simple mean of the displayed category values. Two rounded scorecards cannot identify the weighting formula, source ingestion behavior, score variability, or the specific causes of the code-quality deduction. The observed improvement is evidence that the previous maintenance release was insufficient to reach the user's target, not proof that shorter files were the evaluator's principal concern.

### Follow-up correctness audit

An isolated test reproduced a concrete storage defect: the first stale write was rejected, but the optimistic revision then advanced and a second edit could overwrite another tab's saved payment. The prior cross-tab browser test stopped after the first rejection and reload, so it did not cover this continuation. This is a confirmed application defect; it is not evidence that the organizer detected that particular defect.

The fix uses an explicit expected revision in the IndexedDB write transaction and rejects missing/deleted records, mismatched bases, and skipped revisions. Exact retries remain idempotent. A testable per-event write queue blocks queued and future edits after failure; the affected view pauses editing and offers an unsaved JSON backup plus a reload action. Other events remain independent. New tests exercise multiple queued edits after a conflict, generic storage failure, fresh-workspace recovery and deletion protection. AI contracts, quotas, event templates and budget arithmetic are unchanged.

The correction passes **71 unit/integration tests**, strict typecheck, zero-warning lint and formatting checks. Scoped coverage is **100% lines/statements/functions and 98.21% branches**. The focused mobile browser regression verifies that the rejected working copy can be downloaded, the saved payment survives reload, editing is paused, navigation remains available, and the failure view passes automated accessibility checks. Full release browser/CI results must also pass for the published commit. These results do not constitute a new organizer evaluation.

The next priorities are demonstrated correctness, consistent data contracts and necessary-only source cleanup, with regression evidence for every change. The broader lint audit of worker, database, libraries and scripts also passed; simply adding that scope to a command is not evidence that it will improve the score. Do not use the third competition attempt merely to test a formatting hypothesis.

The iteration targets the demonstrated code-quality gap. The planner entry component fell from 907 lines to under 200 and chat from 509 lines to under 200, with persistence, requests, task rules, proposal review, dialogs, navigation and views separated by responsibility. Static event templates are separate from algorithms. Ordered stylesheet modules preserve the existing cascade. No runtime dependency was added.

Strict TypeScript now rejects unused declarations, incomplete returns and fallthrough. Lint enforces application file/function size, complexity, nesting and non-null assertion rules. Formatting and scoped coverage thresholds are enforced in CI. The additional tests cover task dependencies and filtering, safe client response narrowing, exact form parsing, invalid-field focus and recovery, forced-color keyboard interaction, minimum task targets, legacy backup integrity, same-event navigation and conflicting edits across tabs.

Verified locally: **67 unit/integration tests and 20 development browser tests pass**. Scoped coverage remains **100% lines/statements/functions**, with branches **98.11%** (previously 97.76%). Typecheck, zero-warning lint, formatting and the production build pass; production dependency audit reports zero known vulnerabilities. Built-Worker, public deployment and release-commit CI checks are separate release gates and must be verified after packaging. The form regression test found and fixed React action reset clearing previously entered values after validation failure.

The same **20 browser tests also passed against the built production Worker** before packaging. Public deployment and GitHub CI are verified against the release commit separately; those statuses are available from Sites and the linked GitHub Actions run.

Security boundaries, durable quotas, integer money rules, protected allocations, payment records, explicit AI review, exports and the three event types remain in place. Accessibility improvements add described field errors, invalid-field focus, larger task targets, a progressbar, visible radio focus, keyboard scrolling in chat and forced-color checkbox styling. Human screen-reader verification and the full fifteen-case live AI evaluation remain separate pending checks. No new competition attempt is submitted by publishing these changes.

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

Live Gemini requests passed for weddings, birthdays, and community events using gemini-3.1-flash-lite. Wedding: 8 tasks, 3 ideas, 5 schedule entries; birthday: 8 tasks, 3 ideas, 5 schedule entries; community: 7 tasks, 3 ideas, 6 schedule entries. Each response passed server-side schema and schedule validation. These three smoke cases do not constitute the complete fifteen-case AI evaluation. Hosted deployment and live Gemini generation were also verified. Currency wording was tightened after live output review: the model receives explicit major currency units, and assumptions must start with Verify. A fresh recorded live walkthrough passed with this contract. Public access and anonymous Gemini generation were verified after the user authorized public judging access. A human screen-reader spot check remains pending. The user has since submitted two evaluations; this agent has not submitted an additional attempt. Demo and LinkedIn publication status must be checked with the user before another competition submission.

Chat release verification: 56 unit/integration tests and all 15 development browser tests passed. Typecheck and lint passed without warnings. Scoped coverage is 100% statements/lines/functions and 97.76% branches; the production dependency audit reports zero known vulnerabilities. A real Gemini conversation successfully proposed preferences and checklist tasks, applied them after explicit approval, and answered a contextual follow-up. Chat and its preview passed automated accessibility scans at desktop and mobile sizes. This records local verification; deployment and CI must also pass for the release commit.

Coverage is scoped to `domain`, `server`, `storage`, `exports`, and `lib/ai-response.ts`. React UI and deployed API routing are assessed separately; do not describe the scoped number as whole-application coverage.

## Six-category assessment

| Category | Review and evidence | Remaining limit |
| --- | --- | --- |
| Code quality | Strict TypeScript, lint, shared provider and endpoint boundaries, separate domain/storage/UI modules | Automated checks cannot establish a hidden judge's score |
| Security | Bounded input/output, strict schemas, server-only key, same-origin checks, durable quota, escaped text, protected/stale change validation | No independent penetration test; shared quota can be exhausted by other visitors |
| Efficiency | Bounded chat history/context, token and request limits, one provider call per user action, deterministic local calculations | No sustained production load benchmark; free-tier latency and availability vary |
| Testing | 67 unit/integration tests, 20 browser tests, live generation and chat smoke checks | Full fifteen-case live AI evaluation remains pending |
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
