# fix-3c655bcd3dfd981c — Inconsistent counter name validation — handler allows hyphens, store rejects them

**Weight:** 0.0000 (share of project budget)
**Reward:** 0 TALLY

E2T3's handler validates counter names with regex `/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/` (allows hyphens `-`), and the `/new` usage message tells users: "letters, digits, hyphens, and underscores only". But the backing store's `isValidName` uses `/^[a-zA-Z0-9_]+$/` which does **not** allow hyphens. A name like `my-counter` passes handler validation but is silently rejected by `createUserCounter` with the store's error message "Invalid counter name. Use only letters, numbers, and underscores." — contradicting what the handler's own message advertises.

Relevant lines: `src/handlers/E2T3.ts:5` (handler regex) vs `src/stores/counter.ts:22` (store regex).

## Dialog tests

This is a FIX task: the behavior it repairs is already covered by an existing spec under `tests/specs/`. Fix the code to make that existing spec pass — do NOT author a new `tests/specs/fix-3c655bcd3dfd981c.json` (a duplicate spec for the same behavior makes the tests-gate count it twice and it can never go green). Add a new spec file ONLY if you are introducing genuinely new user-facing behavior that no existing spec covers; if so, name it `tests/specs/fix-3c655bcd3dfd981c.json` (and any new command `tests/commands/fix-3c655bcd3dfd981c.json`).


## Handler module

This is a FIX task. Find the EXISTING handler under `src/handlers/` that implements the affected command/behavior and EDIT it in place. Do NOT create a new `src/handlers/fix-3c655bcd3dfd981c.ts` — a second `Composer` binding the same command conflicts with the original and breaks the bot. Create a new handler file ONLY if the affected command does not exist anywhere yet (then name it `src/handlers/fix-3c655bcd3dfd981c.ts` and default-export a grammY `Composer`; `buildBot()` auto-loads it). NEVER edit `src/bot.ts`; the global error boundary + unknown-command fallback already live in `buildBot()`.


## Implementation contract

Ship a COMPLETE, working implementation — not a stub. A task is INCOMPLETE (and will be rejected) even if it compiles and the dialog tests pass when it does any of these:
- **Stubbed code:** empty bodies, `TODO`/`FIXME`, commented-out logic, or `throw new Error("not implemented")`.
- **Fabricated data:** `Math.random()`, hardcoded sample arrays, or canned responses standing in for real computed or fetched values.
- **No in-memory data store:** a `Map`/array/module-level variable used as a database is a defect. Anything that must survive a restart (records, subscriptions, balances, schedules, settings) MUST use the toolkit's persistent storage (Redis-backed), not process memory. (The toolkit's auto-selected session storage is only for ephemeral conversation state.)
- **Broken integrations:** call external APIs against their real contract — correct endpoints, ids and params (e.g. a coin *id* like `the-open-network`, not a ticker like `TON`) — with credentials read from env. Do not invent endpoints or fake responses.
- **Dead code:** the feature's command/handler must be registered via its default-exported `Composer` in `src/handlers/<slug>.ts` (auto-loaded) and reachable from the bot's command surface.
If the spec is genuinely under-specified, implement the smallest REAL slice you can verify and note the gap — never fake behavior to make the PR look complete.
