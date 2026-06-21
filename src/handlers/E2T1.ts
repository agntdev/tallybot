import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { resolveSessionStorage } from "../toolkit/index.js";

interface CounterData {
  default: number;
}

const COUNTER_FIELD = "default";

function counterKey(userId: number): string {
  return `tallybot:${userId}:counters`;
}

function getStorage() {
  if (!process.env.REDIS_URL) return null;
  return resolveSessionStorage<CounterData>(undefined);
}

const composer = new Composer<Ctx>();

composer.command("tally", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not determine your user ID.");
    return;
  }

  const storage = getStorage();
  if (!storage) {
    await ctx.reply("Tally service is unavailable. Set REDIS_URL to enable counters.");
    return;
  }

  const k = counterKey(userId);
  let data = await storage.read(k);
  if (data === undefined) {
    data = { default: 0 };
  }
  data.default += 1;
  await storage.write(k, data);
  await ctx.reply(`Your tally: ${data.default}`);
});

export default composer;