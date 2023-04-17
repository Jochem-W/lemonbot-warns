import { Discord } from "../clients.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../types/handler.mjs"
import { upload } from "../utilities/s3Utilities.mjs"
import { Variables } from "../variables.mjs"
import type { Message } from "discord.js"
import { EmbedBuilder, userMention } from "discord.js"

const mailUser = await Discord.users.fetch(DefaultConfig.guild.mailUserId)

export class MessageCreateHandler implements Handler<"messageCreate"> {
  public readonly event = "messageCreate"
  public readonly once = false

  public async handle(message: Message) {
    if (message.author.bot) {
      return
    }

    if (!message.inGuild()) {
      await message.reply({
        embeds: [
          new EmbedBuilder().setDescription(
            `Messages that are sent here won't be read, please open a mod mail thread by sending a direct message to ${
              mailUser.username
            } ${userMention(mailUser.id)} instead!`
          ),
        ],
      })

      return
    }

    if (message.guildId !== DefaultConfig.guild.id) {
      return
    }

    for (const [, attachment] of message.attachments) {
      const key = new URL(attachment.url).pathname.slice(1)
      const response = await fetch(attachment.url)
      await upload(
        Variables.s3ArchiveBucketName,
        key,
        response.body ?? undefined,
        attachment.contentType ?? undefined
      )
    }
  }
}
