## Summary
TallyBot is a simple Telegram bot that provides per-user named counters (tallies). Each Telegram user has their own independent set of counters; counters are persisted in Redis via the provided toolkit. The bot exposes simple text commands to create, increment, read, reset and list counters. All input is validated and errors are handled with clear messages.

## Audience
Telegram users who want simple per-user counters (e.g., track habits, scores, counts). Each user's counters are private and visible only to that Telegram user.

## Core entities
- User (Telegram user id) — owner/namespace for counters.
- Counter — named tally with an integer value (stored as integer).

Each counter has:
- name (string key, unique within the user namespace)
- value (signed integer)

## Integrations & notification targets
- Redis (via the provided toolkit) for persistence.
- Telegram Bot API only (no external APIs nor webhooks beyond standard Telegram).
- No email/SMS/third-party notifications.

## Interaction flows (commands and exact behavior)
All commands are text commands the user sends to the bot in private chat or group (but counters are per-user regardless of chat type). Commands must handle missing/invalid input gracefully with helpful usage examples.

1) /start
- Reply: short welcome and brief usage summary (one-liner + link to /help usage). Example: "Welcome to TallyBot — use /new <name> to create a counter, /inc <name> [n] to add, /get <name>, /reset <name>, /list."

2) /new <name>
- Create a new counter with value 0.
- Errors:
  - If <name> missing -> reply with usage: "Usage: /new <name> — create a counter named 'name'."
  - If counter already exists -> "Counter 'name' already exists. Use /inc or /reset."
  - If name invalid (empty or violates allowed pattern/length) -> friendly error (see name rules below).
- Success: "Counter 'name' created (0)."

3) /inc <name> <n>
- Increment counter 'name' by integer n. If n omitted, default to 1.
- Input validation:
  - If name missing -> usage: "Usage: /inc <name> [n] — increments by n (default 1)."
  - If counter does not exist -> "Counter 'name' not found. Create with /new <name>."
  - If n present but non-integer -> "Invalid increment 'X'. Provide an integer, e.g. /inc apples 2 or /inc apples -1."
- Behavior: apply signed integer delta; return updated value. Use atomic Redis operation (HINCRBY) to avoid races.
- Success example: "/inc apples 3 -> 'apples' = 7"

4) /get <name>
- Return current count value or error if not found. Usage message if name missing.
- Example success: "apples: 7"

5) /reset <name>
- Set counter back to 0. If missing -> usage. If not found -> error. On success reply: "'name' reset to 0."

6) /list
- Reply with alphabetical list of counters and their values, one per line: "name: value". If none -> friendly message: "You have no counters yet — create one with /new <name>."

General messaging rules
- Keep replies concise and friendly.
- Use consistent single-quote quoting for counter names in messages (e.g. 'apples').
- All commands handle missing/invalid input with usage examples.

## Persistence
- Redis via toolkit. Key schema:
  - Use a hash per user: key = "tallybot:{telegram_user_id}:counters" (e.g. "tallybot:12345678:counters").
  - Field = counter name (string), Value = integer (stored as string but manipulated with integer Redis ops).
- Operations mapping:
  - Create: HSETNX key name 0 (fail when exists)
  - Increment: HINCRBY key name delta (ensure existence check first or create? We require existence; return error if field missing)
  - Get: HGET key name
  - Reset: HSET key name 0
  - List: HGETALL key (or HSCAN for large sets)
- Concurrency: increments use HINCRBY to be atomic.
- Limits: enforce a per-user counter count limit (default 1000 counters) to avoid unbounded usage. Return clear error when limit reached.

## Edge cases & validation
- Counter name rules: allow UTF-8 strings trimmed of surrounding whitespace, disallow empty names. Limit length to 64 characters. Disallow newlines and control characters. (Sanitize by trimming and rejecting if empty after trim.)
- Increment 'n' must parse as a base-10 signed integer within 64-bit signed range; error on non-numeric.
- Allow negative increments (so counters can be decremented).
- Maximum counters per user: 1000 (to keep Redis sane).

## Payments
- None. No payment or billing integrations.

## Non-goals
- No shared/group counters (counters are per-user only).
- No export/import, no currency handling, no analytics dashboards.
- No external APIs beyond Telegram and Redis.

## Operational notes for build
- Bot will run as a single process or horizontally; Redis is the source of truth. Use environment variable TELEGRAM_BOT_TOKEN for the bot token and existing toolkit for Redis access.
- Logging: concise INFO logs for commands and WARN for Redis errors.

## Assumptions & defaults
- Counters are scoped per Telegram user (user-private). Rationale: user indicated per-user and this matches the common expectation for private counters.
- Redis schema uses one hash per user: "tallybot:{user_id}:counters". Rationale: efficient lookup/listing and atomic HINCRBY support.
- Counter values are stored as signed integers. Rationale: simpler, avoids floating precision issues for counts.
- Increment delta defaults to 1 when omitted. Rationale: conventional behavior for counters.
- Counter names are UTF-8 strings, trimmed, max 64 chars, no control/newline chars. Rationale: prevents abuse and keeps keys small.
- Max counters per user = 1000. Rationale: reasonable operational limit to avoid runaway Redis growth.
- Creation fails if name already exists; increments require existing counter. Rationale: explicit user intent for counter lifecycle (avoid accidental creates via /inc).
- Allow negative increments (decrements). Rationale: provides flexibility to correct counts.
- No payments, no external notifications, no shared counters. Rationale: keeps scope minimal and matches original spec.

If you want any of the assumptions changed (e.g., global counters, auto-creating counters on /inc, higher limits, or allowing floats), tell me now; otherwise I will start implementing from this spec.