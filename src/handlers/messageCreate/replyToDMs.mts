import { Config } from "../../models/config.mjs"
import { handler } from "../../models/handler.mjs"
import { EmbedBuilder, userMention } from "discord.js"

export const ReplyToDMs = handler({
  event: "messageCreate",
  once: false,
  async handle(message) {
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
})
