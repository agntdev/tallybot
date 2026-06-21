import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "../toolkit/index.js";

interface CounterEntry {
  value: number;
}

const COUNTER_PREFIX = "counter:";

let _storage: StorageAdapter<CounterEntry> | null = null;

function storage(): StorageAdapter<CounterEntry> {
  if (!_storage) {
    _storage = resolveSessionStorage<CounterEntry>(undefined);
  }
  return _storage;
}

function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

function key(name: string): string {
  return COUNTER_PREFIX + name;
}

export interface CounterResult {
  ok: boolean;
  value?: number;
  error?: string;
}

export async function createCounter(name: string): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /new <name>" };
  if (!isValidName(name)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, and underscores." };
  const s = storage();
  const existing = await s.read(key(name));
  if (existing !== undefined) return { ok: false, error: `Counter '${name}' already exists.` };
  await s.write(key(name), { value: 0 });
  return { ok: true, value: 0 };
}

export async function getCounter(name: string): Promise<CounterResult> {
  const s = storage();
  const entry = await s.read(key(name));
  if (entry === undefined) return { ok: false, error: `Counter '${name}' not found.` };
  return { ok: true, value: entry.value };
}

export async function incrementCounter(name: string, delta: number): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /inc <name> [n]" };
  if (!isValidName(name)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, and underscores." };
  const s = storage();
  const entry = await s.read(key(name));
  if (entry === undefined) return { ok: false, error: `Counter '${name}' not found.` };
  const newValue = entry.value + delta;
  await s.write(key(name), { value: newValue });
  return { ok: true, value: newValue };
}

export async function resetCounter(name: string): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /reset <name>" };
  if (!isValidName(name)) return { ok: false, error: "Invalid counter name. Use only letters, numbers, and underscores." };
  const s = storage();
  const entry = await s.read(key(name));
  if (entry === undefined) return { ok: false, error: `Counter '${name}' not found.` };
  await s.write(key(name), { value: 0 });
  return { ok: true, value: 0 };
}

export async function deleteCounter(name: string): Promise<CounterResult> {
  if (!name) return { ok: false, error: "Usage: /delete <name>" };
  const s = storage();
  const entry = await s.read(key(name));
  if (entry === undefined) return { ok: false, error: `Counter '${name}' not found.` };
  await s.write(key(name), undefined as unknown as CounterEntry);
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