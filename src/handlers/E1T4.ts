import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore, isValidCounterName } from "../counter-store.js";

const COUNTER_PREFIX = "counter:";

const composer = new Composer<Ctx>();

composer.command("reset", async (ctx) => {
  const text = ctx.message?.text?.trim() ?? "";
  const match = /^\/reset\b(?:\s+([^\s].*?))?\s*$/u.exec(text);
  const name = match ? (match[1] ?? "").trim() : "";

  if (!name) {
    await ctx.reply("Usage: /reset <name>");
    return;
  }

  if (!isValidCounterName(name)) {
    await ctx.reply("Invalid counter name. Use 1-50 characters starting with a letter or digit: letters, digits, hyphens, and underscores only.");
    return;
  }

  const key = COUNTER_PREFIX + name;
  const existing = await counterStore.read(key);
  if (existing === undefined) {
    await ctx.reply("Counter not found.");
    return;
  }

  await counterStore.write(key, { name, value: 0 });
  await ctx.reply(`Counter "${name}" reset to 0.`);
});

export default composer;