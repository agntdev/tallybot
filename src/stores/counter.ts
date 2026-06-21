import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "../toolkit/index.js";
import { RedisSessionStorage } from "../toolkit/session/redis.js";

interface CounterEntry {
  value: number;
}

interface RedisLike {
  eval(script: string, numKeys: number, ...keysAndArgs: string[]): Promise<unknown>;
}

const COUNTER_PREFIX = "counter:";
const USER_COUNT_PREFIX = "counter_user_count:";

export const MAX_COUNTERS_PER_USER = 1000;

let _storage: StorageAdapter<CounterEntry> | null = null;

function storage(): StorageAdapter<CounterEntry> {
  if (!_storage) {
    _storage = resolveSessionStorage<CounterEntry>(undefined);
  }
  return _storage;
}

function isRedisStorage(s: StorageAdapter<CounterEntry>): s is RedisSessionStorage<CounterEntry> {
  return s instanceof RedisSessionStorage;
}

function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name.trim());
}

function key(name: string): string {
  return COUNTER_PREFIX + name;
}

function userCounterKey(userId: number, name: string): string {
  return `${COUNTER_PREFIX}${userId}:${name}`;
}

function userCountKey(userId: number): string {
  return `${USER_COUNT_PREFIX}${userId}`;
}

export interface CounterResult {
  ok: boolean;
  value?: number;
  error?: string;
}

export async function createCounter(name: string): Promise<CounterResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Usage: /new <name>" };
  if (!isValidName(trimmed)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, hyphens, and underscores." };
  const s = storage();
  const existing = await s.read(key(trimmed));
  if (existing !== undefined) return { ok: false, error: `Counter '${trimmed}' already exists.` };
  await s.write(key(trimmed), { value: 0 });
  return { ok: true, value: 0 };
}

export async function getCounter(name: string): Promise<CounterResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Usage: /get <name>" };
  const s = storage();
  const entry = await s.read(key(trimmed));
  if (entry === undefined) return { ok: false, error: `Counter '${trimmed}' not found.` };
  return { ok: true, value: entry.value };
}

export async function incrementCounter(name: string, delta: number): Promise<CounterResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Usage: /inc <name> [n]" };
  if (!isValidName(trimmed)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, hyphens, and underscores." };
  const s = storage();
  const entry = await s.read(key(trimmed));
  if (entry === undefined) return { ok: false, error: `Counter '${trimmed}' not found.` };
  const newValue = entry.value + delta;
  await s.write(key(trimmed), { value: newValue });
  return { ok: true, value: newValue };
}

export async function resetCounter(name: string): Promise<CounterResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Usage: /reset <name>" };
  if (!isValidName(trimmed)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, hyphens, and underscores." };
  const s = storage();
  const entry = await s.read(key(trimmed));
  if (entry === undefined) return { ok: false, error: `Counter '${trimmed}' not found.` };
  await s.write(key(trimmed), { value: 0 });
  return { ok: true, value: 0 };
}

export async function deleteCounter(name: string): Promise<CounterResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Usage: /delete <name>" };
  const s = storage();
  const entry = await s.read(key(trimmed));
  if (entry === undefined) return { ok: false, error: `Counter '${trimmed}' not found.` };
  await s.write(key(trimmed), undefined as unknown as CounterEntry);
  return { ok: true, value: 0 };
}

export async function listCounters(): Promise<{ ok: true; counters: Array<{ name: string; value: number }> }> {
  const s = storage();
  const entries: Array<{ name: string; value: number }> = [];
  if (s.readAllKeys) {
    const keys = s.readAllKeys();
    const keyList = Symbol.asyncIterator in Object(keys)
      ? keys as AsyncIterableIterator<string>
      : keys as IterableIterator<string>;
    for await (const k of keyList) {
      if (k.startsWith(COUNTER_PREFIX) && !k.startsWith(USER_COUNT_PREFIX)) {
        const entry = await s.read(k);
        if (entry !== undefined) {
          entries.push({ name: k.slice(COUNTER_PREFIX.length), value: entry.value });
        }
      }
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, counters: entries };
}

export async function countUserCounters(userId: number): Promise<number> {
  const s = storage();
  const entry = await s.read(userCountKey(userId));
  if (entry !== undefined) return entry.value;
  return 0;
}

export async function createUserCounter(name: string, userId: number): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /new <name>" };
  if (!isValidName(name)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, hyphens, and underscores." };

  const s = storage();
  const counterK = userCounterKey(userId, name);
  const countK = userCountKey(userId);

  const existing = await s.read(counterK);
  if (existing !== undefined) return { ok: false, error: `Counter '${name}' already exists.` };

  if (isRedisStorage(s)) {
    const fullCountKey = s.resolveKey(countK);
    const fullCounterKey = s.resolveKey(counterK);

    const luaScript = `
      local countKey = KEYS[1]
      local counterKey = KEYS[2]
      local maxCount = tonumber(ARGV[1])
      local counterValue = ARGV[2]

      if redis.call('EXISTS', counterKey) == 1 then
        return {err = 'EXISTS'}
      end

      local count = redis.call('INCR', countKey)
      if count > maxCount then
        redis.call('DECR', countKey)
        return {err = 'LIMIT', count = count - 1}
      end

      redis.call('SET', counterKey, counterValue)
      return {ok = 1}
    `;

    const result = await (s.client as RedisLike).eval(
      luaScript,
      2,
      fullCountKey,
      fullCounterKey,
      String(MAX_COUNTERS_PER_USER),
      JSON.stringify({ value: 0 }),
    ) as { ok?: number; err?: string; count?: number };

    if (result.err === 'EXISTS') {
      return { ok: false, error: `Counter '${name}' already exists.` };
    }
    if (result.err === 'LIMIT') {
      return { ok: false, error: `Counter limit reached. You have ${result.count} counters (maximum ${MAX_COUNTERS_PER_USER}).` };
    }
    if (result.ok === 1) {
      return { ok: true, value: 0 };
    }

    return { ok: false, error: "Failed to create counter." };
  }

  const countEntry = await s.read(countK);
  const currentCount = countEntry !== undefined ? countEntry.value : 0;
  if (currentCount >= MAX_COUNTERS_PER_USER) {
    return { ok: false, error: `Counter limit reached. You have ${currentCount} counters (maximum ${MAX_COUNTERS_PER_USER}).` };
  }

  await s.write(countK, { value: currentCount + 1 });
  await s.write(counterK, { value: 0 });
  return { ok: true, value: 0 };
}