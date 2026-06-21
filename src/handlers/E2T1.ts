import { Composer } from "grammy";
import { createRequire } from "node:module";
import type { Ctx } from "../bot.js";

interface RedisHashOps {
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
}

const REDIS_URL = process.env.REDIS_URL;

let _redis: RedisHashOps | null | undefined;

function redis(): RedisHashOps | null {
  if (_redis === undefined) {
    if (!REDIS_URL) {
      _redis = null;
      return null;
    }
    try {
      const require = createRequire(import.meta.url);
      const ioredis: unknown = require("ioredis");
      const Redis =
        (ioredis as { default?: new (url: string, opts: object) => RedisHashOps }).default ??
        (ioredis as { Redis?: new (url: string, opts: object) => RedisHashOps }).Redis ??
        (ioredis as new (url: string, opts: object) => RedisHashOps);
      _redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
    } catch {
      _redis = null;
    }
  }
  return _redis;
}

function counterKey(userId: number): string {
  return `tallybot:${userId}:counters`;
}

const COUNTER_FIELD = "default";

export async function incrementCounter(userId: number): Promise<number> {
  const r = redis();
  if (!r) throw new Error("Redis not configured");
  const k = counterKey(userId);
  await r.hsetnx(k, COUNTER_FIELD, "0");
  return r.hincrby(k, COUNTER_FIELD, 1);
}

export async function getCounter(userId: number): Promise<number> {
  const r = redis();
  if (!r) throw new Error("Redis not configured");
  const k = counterKey(userId);
  await r.hsetnx(k, COUNTER_FIELD, "0");
  const val = await r.hincrby(k, COUNTER_FIELD, 0);
  return val;
}

const composer = new Composer<Ctx>();

composer.command("tally", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not determine your user ID.");
    return;
  }
  try {
    const count = await incrementCounter(userId);
    await ctx.reply(`Your tally: ${count}`);
  } catch {
    await ctx.reply("Tally service is unavailable. Set REDIS_URL to enable counters.");
  }
});

export default composer;