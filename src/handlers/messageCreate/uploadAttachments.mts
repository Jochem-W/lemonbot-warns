import { DefaultConfig } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { upload } from "../../utilities/s3Utilities.mjs"
import { Variables } from "../../variables.mjs"
import type { Message } from "discord.js"

export const UploadAttachments: Handler<"messageCreate"> = {
  event: "messageCreate",
  once: false,
  async handle(message: Message) {
    if (
      message.author.bot ||
      !message.inGuild() ||
      message.guildId !== DefaultConfig.guild.id
    ) {
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
  },
}
