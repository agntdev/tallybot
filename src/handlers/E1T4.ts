import { Composer } from "grammy";
import { createRequire } from "node:module";
import type { Ctx } from "../bot.js";

interface RedisHashOps {
  hset(key: string, field: string, value: string): Promise<number>;
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

async function resetCounter(userId: number, name: string): Promise<void> {
  const r = redis();
  if (!r) throw new Error("Redis not configured");
  const k = counterKey(userId);
  await r.hset(k, name, "0");
}

const composer = new Composer<Ctx>();

composer.command("reset", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not determine your user ID.");
    return;
  }

  const text = ctx.message?.text?.trim() ?? "";
  const match = /^\/reset\b(?:\s+([^\s].*?))?\s*$/u.exec(text);
  const name = match ? (match[1] ?? "").trim() : "";

  if (!name) {
    await ctx.reply("Usage: /reset <name>");
    return;
  }

  try {
    await resetCounter(userId, name);
    await ctx.reply(`Counter "${name}" reset to 0.`);
  } catch {
    await ctx.reply("Tally service is unavailable. Set REDIS_URL to enable counters.");
  }
});

export default composer;