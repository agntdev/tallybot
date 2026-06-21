import { Composer } from "grammy";
import { createRequire } from "node:module";
import type { Ctx } from "../bot.js";

interface RedisHashOps {
  hincrby(key: string, field: string, increment: number): Promise<number>;
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

function counterKey(key: string): string {
  return `e2t2:${key}`;
}

const FIELD = "value";

const composer = new Composer<Ctx>();

composer.command("aincr", async (ctx) => {
  const raw = ctx.match?.trim() ?? "";

  if (raw === "") {
    await ctx.reply(
      "Usage: /aincr <key> [amount]\n\nAtomically increment a counter using Redis HINCRBY. Amount defaults to 1.",
    );
    return;
  }

  const parts = raw.split(/\s+/);
  const key = parts[0];
  const amount = parts.length >= 2 ? parseInt(parts[1], 10) : 1;

  if (isNaN(amount)) {
    await ctx.reply("Invalid amount. Must be an integer.");
    return;
  }

  const r = redis();
  if (!r) {
    await ctx.reply("Redis is not configured. Set REDIS_URL to enable atomic counters.");
    return;
  }

  try {
    const val = await r.hincrby(counterKey(key), FIELD, amount);
    await ctx.reply(`Counter "${key}" incremented by ${amount}. Current value: ${val}`);
  } catch {
    await ctx.reply("Failed to increment counter.");
  }
});

composer.command("areset", async (ctx) => {
  const raw = ctx.match?.trim() ?? "";

  if (raw === "") {
    await ctx.reply(
      "Usage: /areset <key> [value]\n\nAtomically reset a counter using Redis HSET. Value defaults to 0.",
    );
    return;
  }

  const parts = raw.split(/\s+/);
  const key = parts[0];
  const value = parts.length >= 2 ? parseInt(parts[1], 10) : 0;

  if (isNaN(value)) {
    await ctx.reply("Invalid value. Must be an integer.");
    return;
  }

  const r = redis();
  if (!r) {
    await ctx.reply("Redis is not configured. Set REDIS_URL to enable atomic counters.");
    return;
  }

  try {
    await r.hset(counterKey(key), FIELD, String(value));
    await ctx.reply(`Counter "${key}" reset to ${value}.`);
  } catch {
    await ctx.reply("Failed to reset counter.");
  }
});

export default composer;