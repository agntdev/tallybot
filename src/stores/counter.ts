import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "../toolkit/index.js";

interface CounterEntry {
  value: number;
}

const COUNTER_PREFIX = "counter:";

export const MAX_COUNTERS_PER_USER = 1000;

let _storage: StorageAdapter<CounterEntry> | null = null;

function storage(): StorageAdapter<CounterEntry> {
  if (!_storage) {
    _storage = resolveSessionStorage<CounterEntry>(undefined);
  }
  return _storage;
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

function userCountersPrefix(userId: number): string {
  return `${COUNTER_PREFIX}${userId}:`;
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
      if (k.startsWith(COUNTER_PREFIX)) {
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
  const prefix = userCountersPrefix(userId);
  let count = 0;
  if (s.readAllKeys) {
    const keys = s.readAllKeys();
    const keyList = Symbol.asyncIterator in Object(keys)
      ? keys as AsyncIterableIterator<string>
      : keys as IterableIterator<string>;
    for await (const k of keyList) {
      if (k.startsWith(prefix)) {
        count++;
      }
    }
  }
  return count;
}

export async function createUserCounter(name: string, userId: number): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /new <name>" };
  if (!isValidName(name)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, hyphens, and underscores." };
  const existingCount = await countUserCounters(userId);
  if (existingCount >= MAX_COUNTERS_PER_USER) {
    return { ok: false, error: `Counter limit reached. You have ${existingCount} counters (maximum ${MAX_COUNTERS_PER_USER}).` };
  }
  const s = storage();
  const k = userCounterKey(userId, name);
  const existing = await s.read(k);
  if (existing !== undefined) return { ok: false, error: `Counter '${name}' already exists.` };
  await s.write(k, { value: 0 });
  return { ok: true, value: 0 };
}