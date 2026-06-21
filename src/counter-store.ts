import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/index.js";

export interface Counter {
  name: string;
  value: number;
}

export interface CounterStore extends StorageAdapter<Counter> {
  readAllKeys(): string[] | AsyncIterableIterator<string>;
}

export const VALID_COUNTER_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/;

export function isValidCounterName(name: string): boolean {
  return VALID_COUNTER_NAME_RE.test(name);
}

export const counterStore = resolveSessionStorage<Counter>(undefined, process.env) as CounterStore;

const COUNTER_STORE_PREFIX = "counter:";

export async function clearAllCounters(): Promise<void> {
  const keys = counterStore.readAllKeys();
  const keyList = Array.isArray(keys) ? keys : [];
  if (!Array.isArray(keys)) {
    for await (const k of keys) keyList.push(k);
  }
  for (const k of keyList) {
    if (k.startsWith(COUNTER_STORE_PREFIX)) {
      await counterStore.delete(k);
    }
  }
}