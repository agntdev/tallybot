import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/index.js";

export interface Counter {
  name: string;
  value: number;
}

export interface CounterStore extends StorageAdapter<Counter> {
  readAllKeys(): string[] | AsyncIterableIterator<string>;
}

export const counterStore = resolveSessionStorage<Counter>(undefined, process.env) as CounterStore;