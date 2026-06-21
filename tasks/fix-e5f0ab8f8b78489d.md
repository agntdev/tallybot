# fix-e5f0ab8f8b78489d — Counter name validation inconsistent across E1 handlers

**Weight:** 0.0000 (share of project budget)
**Reward:** 0 TALLY

The counter name validation rules differ between E1 handler files:

- E1T1 (`/new`): `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$` — 1-50 chars, must start with letter/digit, allows hyphens and underscores.
- E1T2 (`/inc`): `^[a-zA-Z0-9_-]+$` — any length, any start char (allows names starting with `_` or `-`), no max length.
- E1T3 (`/get`): **no validation at all** — any non-empty string is accepted directly as a key.
- E1T4 (`/reset`): **no validation at all** — any non-empty string accepted.

This means a counter created via `/inc start_with_underscore` would succeed in E1T2 but be rejected by E1T1's `/new` validator. Conversely, `/new a-name` works but `/inc` on a name already starting with a letter/digit has no issue. The inconsistency means some validly-created counters might appear missing when accessed via a command with different rules.

## Dialog tests

This is a FIX task: the behavior it repairs is already covered by an existing spec under `tests/specs/`. Fix the code to make that existing spec pass — do NOT author a new `tests/specs/fix-e5f0ab8f8b78489d.json` (a duplicate spec for the same behavior makes the tests-gate count it twice and it can never go green). Add a new spec file ONLY if you are introducing genuinely new user-facing behavior that no existing spec covers; if so, name it `tests/specs/fix-e5f0ab8f8b78489d.json` (and any new command `tests/commands/fix-e5f0ab8f8b78489d.json`).


## Handler module

This is a FIX task. Find the EXISTING handler under `src/handlers/` that implements the affected command/behavior and EDIT it in place. Do NOT create a new `src/handlers/fix-e5f0ab8f8b78489d.ts` — a second `Composer` binding the same command conflicts with the original and breaks the bot. Create a new handler file ONLY if the affected command does not exist anywhere yet (then name it `src/handlers/fix-e5f0ab8f8b78489d.ts` and default-export a grammY `Composer`; `buildBot()` auto-loads it). NEVER edit `src/bot.ts`; the global error boundary + unknown-command fallback already live in `buildBot()`.


## Implementation contract

Ship a COMPLETE, working implementation — not a stub. A task is INCOMPLETE (and will be rejected) even if it compiles and the dialog tests pass when it does any of these:
- **Stubbed code:** empty bodies, `TODO`/`FIXME`, commented-out logic, or `throw new Error("not implemented")`.
- **Fabricated data:** `Math.random()`, hardcoded sample arrays, or canned responses standing in for real computed or fetched values.
- **No in-memory data store:** a `Map`/array/module-level variable used as a database is a defect. Anything that must survive a restart (records, subscriptions, balances, schedules, settings) MUST use the toolkit's persistent storage (Redis-backed), not process memory. (The toolkit's auto-selected session storage is only for ephemeral conversation state.)
- **Broken integrations:** call external APIs against their real contract — correct endpoints, ids and params (e.g. a coin *id* like `the-open-network`, not a ticker like `TON`) — with credentials read from env. Do not invent endpoints or fake responses.
- **Dead code:** the feature's command/handler must be registered via its default-exported `Composer` in `src/handlers/<slug>.ts` (auto-loaded) and reachable from the bot's command surface.
If the spec is genuinely under-specified, implement the smallest REAL slice you can verify and note the gap — never fake behavior to make the PR look complete.
