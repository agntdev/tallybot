import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { menuKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const MAIN_MENU = menuKeyboard([
  { text: "\u{1F4CB} Help", data: "menu:help" },
]);

composer.command("start", async (ctx) => {
  await ctx.reply("Welcome! I am ready to help.", {
    reply_markup: MAIN_MENU,
  });
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Available commands:\n/start - Start the bot\n/help - Show this help message",
  );
});

export default composer;
