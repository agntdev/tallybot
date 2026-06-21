import { Composer } from "grammy";
import type { Ctx } from "../bot.js";

const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;

const INTEGER_RE = /^-?[0-9]+$/;

const composer = new Composer<Ctx>();

composer.command("checkinc", async (ctx) => {
  const raw = (ctx.match ?? "").trim();

  if (raw === "") {
    await ctx.reply(
      `Usage: /checkinc <value>\n\nValidates whether the value is a signed integer within 64-bit range [${INT64_MIN}, ${INT64_MAX}].`,
    );
    return;
  }

  if (!INTEGER_RE.test(raw)) {
    await ctx.reply(`"${raw}" is not a valid signed integer.`);
    return;
  }

  try {
    const big = BigInt(raw);
    if (big < INT64_MIN || big > INT64_MAX) {
      await ctx.reply(
        `"${raw}" is out of range. Must be within [${INT64_MIN}, ${INT64_MAX}].`,
      );
      return;
    }
    await ctx.reply(`"${raw}" is a valid int64 increment.`);
  } catch {
    await ctx.reply(`"${raw}" is not a valid signed integer.`);
  }
});

export default composer;