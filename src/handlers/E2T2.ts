import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { resolveSessionStorage } from "../toolkit/index.js";

interface CounterData {
  value: number;
}

function counterKey(key: string): string {
  return `e2t2:${key}`;
}

function getStorage() {
  if (!process.env.REDIS_URL) return null;
  return resolveSessionStorage<CounterData>(undefined);
}

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

  const storage = getStorage();
  if (!storage) {
    await ctx.reply("Redis is not configured. Set REDIS_URL to enable atomic counters.");
    return;
  }

  const k = counterKey(key);
  let data = await storage.read(k);
  if (data === undefined) {
    data = { value: 0 };
  }
  data.value += amount;
  await storage.write(k, data);
  await ctx.reply(`Counter "${key}" incremented by ${amount}. Current value: ${data.value}`);
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

  const storage = getStorage();
  if (!storage) {
    await ctx.reply("Redis is not configured. Set REDIS_URL to enable atomic counters.");
    return;
  }

  const k = counterKey(key);
  await storage.write(k, { value });
  await ctx.reply(`Counter "${key}" reset to ${value}.`);
});

export default composer;