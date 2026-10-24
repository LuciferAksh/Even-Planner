# Submission preparation

Do not consume any of the three competition attempts during ordinary development. Verify the exact deployed source and all links before the first submission. Deadline: 1 November 2026; confirm the organizer's cutoff time.

## Required fields

- Challenge: select the event planning assistant challenge on the platform.
- Public GitHub repository URL: https://github.com/LuciferAksh/Even-Planner (public source push verified).
- Project deployed URL: https://gather-event-planner.plumamber129.chatgpt.site (private deployment verified; public judge access still requires an audience decision).
- Project demo video URL: a 62-second silent local walkthrough has been recorded and spot-checked. Review and upload the video to obtain a submission URL. The recording is an ignored local artifact, not repository source.
- Changes/updates: use the draft below only after verifying the implemented release.
- GenAI services: use the draft below after a live Gemini test confirms the deployed integration.
- LinkedIn post URL: draft below; publication requires the user's instruction. Never invent a post URL.

## Deployed changes draft (under 1,024 characters)

Initial Gather release: a planning workspace for weddings, birthdays, and community events. Includes editable budgets with exact totals and contingency, task timelines and owners, vendor checklists and quote tracking, and personalized ideas. Scenario previews preserve protected allocations and recorded payments, with undo. Plans save locally and export as JSON backups, budget CSVs, calendar deadlines, or a printable overview. Gemini runs server-side with validated structured output; provider errors preserve the existing plan. Responsive layouts, keyboard controls, input validation, shared AI request limits, and automated domain/browser checks support reliable use.

## GenAI usage draft (under 1,024 characters)

Google Gemini Developer API, using a Google AI Studio free-tier key stored only on the server. After explicit user confirmation, the event brief is sent to Gemini to personalize preparation tasks, practical event ideas, assumptions, and a chronological event-day schedule. Responses use a constrained JSON schema and independent server validation. Application code handles exact budget arithmetic, dates, persistence, and scenario calculations. Vendor names, quotes, payments, and task owners are excluded from AI requests. Template mode is labeled and remains usable if the API is unavailable or quota is exhausted. The submitted release must identify the exact model verified in its deployed configuration.

## Demonstration script (approximately 2–3 minutes; adjust to organizer limits)

1. Open the deployed app without special local setup. State the challenge and show wedding, birthday, and community entry points.
2. Create a fictional wedding with a budget, location, guest count, and specific dietary/access preferences.
3. Personalize with the live Gemini API. Briefly show the generated task list, tailored ideas, and schedule. Do not expose the key or cloud console.
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
