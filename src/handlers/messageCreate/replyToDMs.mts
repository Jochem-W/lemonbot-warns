import { Config } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { EmbedBuilder, userMention, type Message } from "discord.js"

export const ReplyToDMs: Handler<"messageCreate"> = {
  event: "messageCreate",
  once: false,
  async handle(message: Message) {
    if (message.author.bot || message.inGuild()) {
      return
    }

    await message.reply({
      embeds: [
        new EmbedBuilder().setDescription(
          `Messages that are sent here won't be read, please open a mod mail thread by sending a direct message to ${userMention(
            Config.mailUserId
          )} instead!`
        ),
      ],
    })
  },
}
