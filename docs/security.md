# Security design and review

## Trust boundaries

Event descriptions, imported backups, browser requests, provider responses and vendor fields are untrusted data. React renders text; there is no raw-HTML or executable markdown rendering. Imported objects receive strict schema validation, bounded arrays/strings and unique identifiers. Dependency graphs are checked for cycles and invalid ordering with memoized traversal. Imports are capped at 32 MB and 30 events and create separate copies transactionally. The larger bounded backup limit accommodates saved conversations.

Secrets are server-side runtime values. The Gemini credential is sent to Google's fixed HTTPS endpoint using the `x-goog-api-key` header, never in the URL. User input cannot choose the endpoint or model. The configurable server model is restricted to an allowlisted model-name pattern. The browser never accepts or stores API keys.

## Abuse controls

The planning endpoint requires JSON, rejects cross-origin browser requests, checks declared and streamed body size, validates the complete brief, and uses a durable atomic D1 quota across Worker isolates. Missing quota infrastructure fails closed. Provider calls have a timeout and bounded output tokens. Malformed or incomplete responses fail without overwriting an event. The app makes no automatic request loop or hidden retries.

A shared quota reduces total API usage but is not a substitute for bot protection on a widely exposed public service. A large public rollout should add platform-managed rate limiting or a verified challenge before the provider endpoint, without trusting client-supplied identity headers. Do not claim the competition demo is ready for unrestricted commercial traffic.

## Data integrity

Integer minor currency units prevent decimal drift. Allocations preserve exact totals with deterministic remainder handling. Scenarios preserve paid amounts and protected allocations and reject infeasible budgets. Optimistic UI writes are queued; storage revisions detect stale writes across tabs. Late AI responses cannot apply after an event revision changes. Completed tasks survive AI personalization. JSON backups provide recovery for browser-local storage.

Each write supplies the exact expected base revision; IndexedDB compares it atomically before saving the next revision. A conflict or storage failure blocks the affected event's subsequent optimistic writes until reload, including writes already waiting in the queue. This prevents a second edit from bypassing the first conflict by advancing its local counter. The UI pauses editing and offers a backup of the unsaved working copy before reload. A stale edit cannot recreate a record deleted in another tab. Other event queues remain usable.

CSV exports quote text and neutralize formula prefixes. ICS strings escape reserved characters and fold UTF-8 lines at 75 octets. Date-only deadlines use exclusive end dates.

## Privacy

Personalization sends the brief following explicit confirmation. Chat sends the brief, recent user/assistant messages, bounded task summaries, allocation targets, and vendor categories/statuses after the user presses Send under the data-sharing disclosure. Vendor names, quotes, payment records and task owners are excluded from generated event context. Users may type private details into chat, so the disclosure asks them to avoid doing so and explains Google's free-tier data terms. Messages remain browser-local and are included in JSON backups. There is no analytics or third-party advertising. Google Fonts is a presentation dependency; consider self-hosting fonts if eliminating third-party font requests becomes a requirement.

## Conversational changes

Chat accepts at most 60 KB per request and 12 recent messages, using a structured provider response limited to 2,200 tokens. It shares the existing durable AI quota; there is no separate unprotected chat proxy. The response cannot execute tools or call arbitrary URLs. Proposals are limited to preferences, a budget in the event's currency, a guest count, and five new tasks. Unknown fields or unsupported actions are rejected. Application code validates previews, preserves paid and protected amounts, deduplicates tasks, and refuses stale proposals. Nothing is applied without a user click. Failed replies preserve drafts and existing data; closing the dialog aborts waiting in the browser. Client cancellation does not guarantee cancellation of a provider request already received by the server.

## Review checklist

- No credential in source, repository history, build output, screenshots, or demo.
- Production key configured as a secret and restricted appropriately in Google Cloud.
- Lockfile checked with dependency audit; review updates rather than blindly forcing incompatible versions.
- API rejects malformed input, oversized bodies, cross-origin requests and unavailable provider/quota infrastructure.
- Private deployment used for initial review; judge access tested explicitly before submission.
- Public endpoint limits and actual project quotas checked with the configured model.
