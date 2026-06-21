import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore, isValidCounterName } from "../counter-store.js";

const COUNTER_PREFIX = "counter:";

const composer = new Composer<Ctx>();

composer.command("get", async (ctx) => {
  const raw = ctx.match?.trim() ?? "";

  if (raw === "") {
    await ctx.reply("Usage: /get <name>");
    return;
  }

  if (!isValidCounterName(raw)) {
    await ctx.reply("Invalid counter name. Use 1-50 characters starting with a letter or digit: letters, digits, hyphens, and underscores only.");
    return;
  }

  const key = COUNTER_PREFIX + raw;
  const counter = await counterStore.read(key);
  if (counter === undefined) {
    await ctx.reply(`Counter '${raw}' not found.`);
    return;
  }

  await ctx.reply(`${raw}: ${counter.value}`);
});

export default composer;