import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore } from "../counter-store.js";

const COUNTER_PREFIX = "counter:";

const composer = new Composer<Ctx>();

async function collectKeys(): Promise<string[]> {
  const keys = counterStore.readAllKeys();
  if (Array.isArray(keys)) return keys;
  const result: string[] = [];
  for await (const k of keys) result.push(k);
  return result;
}

composer.command("list", async (ctx) => {
  const allKeys = await collectKeys();
  const counterKeys = allKeys.filter((k) => k.startsWith(COUNTER_PREFIX));

  if (counterKeys.length === 0) {
    await ctx.reply("No counters found.");
    return;
  }

  const counters = await Promise.all(
    counterKeys.map(async (key) => {
      const c = await counterStore.read(key);
      const name = key.slice(COUNTER_PREFIX.length);
      return { name, value: c?.value ?? 0 };
    }),
  );

  counters.sort((a, b) => a.name.localeCompare(b.name));

  const lines = counters.map((c) => `${c.name}: ${c.value}`);
  await ctx.reply(lines.join("\n"));
});

export default composer;