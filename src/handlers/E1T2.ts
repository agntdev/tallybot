import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { resolveSessionStorage } from "../toolkit/index.js";

const COUNTERS_KEY = "inc:counters";
const storage = resolveSessionStorage<Record<string, number>>(undefined);

const NAME_RE = /^[a-zA-Z0-9_-]+$/;

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

  if (!NAME_RE.test(name)) {
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

  const counters = (await storage.read(COUNTERS_KEY)) ?? {};
  counters[name] = (counters[name] ?? 0) + delta;
  await storage.write(COUNTERS_KEY, counters);

  await ctx.reply(`Counter '${name}' is now ${counters[name]}`);
});

export default composer;