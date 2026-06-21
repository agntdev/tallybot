import { Composer } from "grammy";
import type { Ctx } from "../bot.js";

const VALID_NAME_RE = /^[a-zA-Z0-9_]+$/;

const composer = new Composer<Ctx>();

composer.command("checkname", async (ctx) => {
  const raw = (ctx.match ?? "").trim();

  if (!raw) {
    await ctx.reply("Usage: /checkname <name>\n\nValidate a counter name. Names must contain only letters, numbers, and underscores.");
    return;
  }

  if (!VALID_NAME_RE.test(raw)) {
    await ctx.reply(`Invalid counter name "${raw}". Use only letters, numbers, and underscores.`);
    return;
  }

  await ctx.reply(`"${raw}" is a valid counter name.`);
});

export default composer;