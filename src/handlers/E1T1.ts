import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore, isValidCounterName, type Counter } from "../counter-store.js";

const composer = new Composer<Ctx>();

composer.command("new", async (ctx) => {
  const raw = ctx.match?.trim() ?? "";

  if (raw === "") {
    await ctx.reply("Usage: /new <name>\n\nCreate a counter with value 0. Name must be 1-50 characters, starting with a letter or digit, using only letters, digits, hyphens, and underscores.");
    return;
  }

  if (!isValidCounterName(raw)) {
    await ctx.reply("Invalid counter name. Use 1-50 characters starting with a letter or digit: letters, digits, hyphens, and underscores only.");
    return;
  }

  const key = `counter:${raw}`;
  const existing = await counterStore.read(key);
  if (existing !== undefined) {
    await ctx.reply(`Counter "${raw}" already exists.`);
    return;
  }

  const counter: Counter = { name: raw, value: 0 };
  await counterStore.write(key, counter);
  await ctx.reply(`Counter "${raw}" created with value 0.`);
});

export default composer;