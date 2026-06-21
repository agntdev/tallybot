import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { counterStore } from "../counter-store.js";

const composer = new Composer<Ctx>();

composer.command("reset", async (ctx) => {
  const name = (ctx.match ?? "").trim();

  if (!name) {
    await ctx.reply("Usage: /reset <name>");
    return;
  }

  const key = `counter:${name}`;
  const existing = await counterStore.read(key);
  if (existing === undefined) {
    await ctx.reply(`Counter "${name}" does not exist.`);
    return;
  }

  await counterStore.write(key, { name, value: 0 });
  await ctx.reply(`Counter "${name}" reset to 0.`);
});

export default composer;