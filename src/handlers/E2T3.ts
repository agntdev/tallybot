import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { createUserCounter, countUserCounters, MAX_COUNTERS_PER_USER } from "../stores/counter.js";

const VALID_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/;

const composer = new Composer<Ctx>();

composer.command("new", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not determine your user ID.");
    return;
  }

  const raw = (ctx.match ?? "").trim();

  if (raw === "") {
    await ctx.reply(
      "Usage: /new <name>\n\nCreate a counter with value 0. Name must be 1-50 characters, starting with a letter or digit, using only letters, digits, hyphens, and underscores.",
    );
    return;
  }

  if (!VALID_NAME_RE.test(raw)) {
    await ctx.reply(
      "Invalid counter name. Use 1-50 characters starting with a letter or digit: letters, digits, hyphens, and underscores only.",
    );
    return;
  }

  const count = await countUserCounters(userId);
  if (count >= MAX_COUNTERS_PER_USER) {
    await ctx.reply(
      `Counter limit reached. You have ${count} counters (maximum ${MAX_COUNTERS_PER_USER}).`,
    );
    return;
  }

  const result = await createUserCounter(raw, userId);
  if (!result.ok) {
    await ctx.reply(result.error!);
    return;
  }

  await ctx.reply(`Counter "${raw}" created with value 0.`);
});

export default composer;