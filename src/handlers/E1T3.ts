import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getCounter } from "../stores/counter.js";

const composer = new Composer<Ctx>();

composer.command("get", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    await ctx.reply("Usage: /get <name>");
    return;
  }
  const name = parts[1];
  const result = await getCounter(name);
  if (!result.ok) {
    await ctx.reply(result.error!);
    return;
  }
  await ctx.reply(`${name}: ${result.value}`);
});

export default composer;