# Submission preparation

Do not consume any of the three competition attempts during ordinary development. Verify the exact deployed source and all links before the first submission. Deadline: 1 November 2026; confirm the organizer's cutoff time.

The user has since reported a submitted evaluation of 96.62/100: code quality 88, security 99, efficiency 100, testing 99, accessibility 98, and problem alignment 100. The maintenance iteration addresses concrete code structure and usability issues. No new score should be claimed until the organizer evaluates a new submission; ordinary deployment does not consume a competition attempt.

Attempt 2 scored 97.06/100: code quality 89, security 99, efficiency 100, testing 100, accessibility 99, and alignment 100. No written feedback or evaluated commit SHA is exposed. Hold the third attempt while reviewing confirmed defects and release evidence; no code change establishes a predicted score of 99.

## Required fields

- Challenge: select the event planning assistant challenge on the platform.
- Public GitHub repository URL: https://github.com/LuciferAksh/Even-Planner (public source push verified).
- Project deployed URL: https://gather-event-planner.plumamber129.chatgpt.site (public access and anonymous Gemini generation verified).
- Project demo video URL: a 62-second silent local walkthrough has been recorded and spot-checked. Review and upload the video to obtain a submission URL. The recording is an ignored local artifact, not repository source.
- Changes/updates: use the draft below only after verifying the implemented release.
- GenAI services: use the draft below after a live Gemini test confirms the deployed integration.
- LinkedIn post URL: draft below; publication requires the user's instruction. Never invent a post URL.

## Deployed changes draft (under 1,024 characters)

Final reliability and maintainability update: Gemini output contracts now derive from application validation schemas, sharing task limits, verification assumptions, strict objects, and chronological schedule validation. Event creation and imports enforce capacity atomically across tabs. Exact-money budgets, protected payments, scenario preview/undo, local persistence, vendor checklists, exports, personalization, and reviewed chat proposals are preserved. Verification includes 78 unit/integration tests, 21 browser tests, strict TypeScript, zero-warning lint, formatting, production build, and dependency audit. Live Gemini checks cover weddings, birthdays, community events, and multi-turn chat. Desktop/mobile accessibility, keyboard focus, legacy backups, and conflict recovery are checked.

## GenAI usage draft (under 1,024 characters)

Google Gemini Developer API (gemini-3.1-flash-lite), using a Google AI Studio free-tier key stored only on the server. Personalization sends the event brief after confirmation to generate tasks, ideas, assumptions, and an event-day schedule. Chat sends recent messages and bounded event context when the user presses Send; it answers questions and proposes changes that require a separate preview and Apply click. Both paths use constrained JSON output and independent validation. Application code handles exact budget arithmetic, dates, persistence, and scenario protections. Generated context excludes vendor names, quotes, payments, and task owners. Messages typed by users are shared under the visible disclosure. Template planning remains usable during API errors or quota exhaustion.

## Demonstration script (approximately 2–3 minutes; adjust to organizer limits)

1. Open the deployed app without special local setup. State the challenge and show wedding, birthday, and community entry points.
2. Create a fictional wedding with a budget, location, guest count, and specific dietary/access preferences.
3. Personalize with the live Gemini API. Briefly show the generated task list, tailored ideas, and schedule. Do not expose the key or cloud console.
   Open Chat with Gather, share an idea, preview and apply its proposed changes, then ask a follow-up to demonstrate context. Keep API requests within the shared free-tier quota.
4. Open Budget. Record a payment and protect the venue allocation. Preview a reduced budget, point out preserved commitments, apply, and undo.
5. Complete a task, assign an owner, and update a vendor booking/quote.
6. Export a budget or calendar; reload and reopen the saved event.
7. Show birthday and community examples. Explain their distinct tasks and vendor categories.
8. Briefly show the repository's test commands, coverage scope, security notes, and known limitations. Quote only actual verified results.

## LinkedIn post draft

I built Gather for Google Prompt Wars: a GenAI-assisted planning workspace for weddings, birthdays, and community events.

Gather brings budgets, timelines, vendor checklists, and personalized ideas into one editable plan. Gemini helps tailor tasks and inspiration, while application code handles exact budget calculations and scenario previews that preserve protected costs and recorded payments.

I focused on all six assessment areas: code quality, security, efficiency, testing, accessibility, and alignment with the challenge.

Try it: [verified deployed URL]
Source: [public GitHub URL]
Demo: [video URL]

Add only organizer-required tags after checking the full rules. Replace placeholders and review privacy before publishing. Do not claim a perfect score or a competition result that has not happened.
