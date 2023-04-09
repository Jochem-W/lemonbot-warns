import { Prisma } from "../clients.mjs"
import { reportError } from "../errors.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../types/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { uploadAttachment } from "../utilities/s3Utilities.mjs"
import type { Message } from "discord.js"
import { ChannelType, EmbedBuilder } from "discord.js"

const warnLogsChannel = await fetchChannel(
  DefaultConfig.guild.warnLogsChannel,
  ChannelType.GuildText
)

export class AppendImageHandler implements Handler<"messageCreate"> {
  public readonly event = "messageCreate"
  public readonly once = false

  public async handle(message: Message) {
    if (message.author.bot) {
      return
    }

    if (
      message.channelId !== DefaultConfig.guild.warnLogsChannel ||
      !message.reference?.messageId ||
      message.attachments.size === 0
    ) {
      return
    }

    const warning = await Prisma.warning.findFirst({
      where: { messageId: message.reference.messageId },
      include: { images: true },
    })

    if (!warning) {
      return
    }

    const attachments = [...message.attachments.values()]
    const extraImageCount = warning.images.filter((i) => i.extra).length
    const exceedsBy = extraImageCount + attachments.length - 4
    if (exceedsBy > 0) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: "Too many images",
              iconURL: DefaultConfig.icons.success.toString(),
            })
            .setDescription(
              `You're trying to add ${exceedsBy} too many image${
                exceedsBy === 1 ? "" : "s"
              }. Warnings can have at most 4 extra images, and this warning already has ${extraImageCount} extra images`
            ),
        ],
      })
      return
    }

    const urls = await Promise.all(attachments.map((a) => uploadAttachment(a)))
    const updatedWarning = await Prisma.warning.update({
      where: { id: warning.id },
      data: {
        images: {
          createMany: {
            data: urls.map((u) => ({ url: u, extra: true })),
          },
        },
      },
      include: {
        penalty: true,
        reasons: true,
        images: true,
      },
    })

    await warnLogsChannel.messages.edit(
      message.reference.messageId,
      await warnLogMessage(updatedWarning)
    )

    const reply = await message.reply({
      embeds: [
        new EmbedBuilder().setAuthor({
          name: `Image${attachments.length === 1 ? "" : "s"} added`,
          iconURL: DefaultConfig.icons.success.toString(),
        }),
      ],
    })
    await message.delete()

    setTimeout(() => void reply.delete().catch(reportError), 2500)
  }
}
