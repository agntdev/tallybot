import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore, isValidCounterName } from "../counter-store.js";

const COUNTER_PREFIX = "counter:";

const composer = new Composer<Ctx>();

composer.command("inc", async (ctx) => {
  const input = (ctx.match ?? "").trim();

  if (!input) {
    await ctx.reply("Usage: /inc <name> [n]");
    return;
  }

  const parts = input.split(/\s+/);
  const name = parts[0];
  const nStr = parts[1];

  if (!isValidCounterName(name)) {
    await ctx.reply(
      "Invalid counter name. Use letters, numbers, hyphens, and underscores.",
    );
    return;
  }

  let delta = 1;
  if (nStr !== undefined) {
    const parsed = Number(nStr);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      await ctx.reply("Invalid increment value. Must be a positive integer.");
      return;
    }
    delta = parsed;
  }

  const key = COUNTER_PREFIX + name;
  const existing = await counterStore.read(key);
  if (existing === undefined) {
    await ctx.reply(`Counter '${name}' not found.`);
    return;
  }
  const newValue = existing.value + delta;
  await counterStore.write(key, { name, value: newValue });

  await ctx.reply(`Counter '${name}' is now ${newValue}`);
});

export default composer;