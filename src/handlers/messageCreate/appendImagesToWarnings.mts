import { Prisma } from "../../clients.mjs"
import { logError } from "../../errors.mjs"
import { warnLogMessage } from "../../messages/warnLogMessage.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { uploadAttachment } from "../../utilities/s3Utilities.mjs"
import { ChannelType, EmbedBuilder, Message } from "discord.js"

export const AppendImagesToWarnings: Handler<"messageCreate"> = {
  event: "messageCreate",
  once: false,
  async handle(message: Message) {
    if (
      message.author.bot ||
      !message.reference?.messageId ||
      message.attachments.size === 0
    ) {
      return
    }

    const warning = await Prisma.warning.findFirst({
      where: { messages: { some: { id: message.reference.messageId } } },
      include: { images: true, guild: true },
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
            .setTitle("Too many images")
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
        images: true,
        guild: true,
        messages: true,
      },
    })

    const reply = await message.reply({
      embeds: [
        new EmbedBuilder().setTitle(
          `Image${attachments.length === 1 ? "" : "s"} added`
        ),
      ],
    })
    await message.delete()

    setTimeout(() => void reply.delete().catch(logError), 2500)

    const logMessage = await warnLogMessage(updatedWarning)
    for (const message of updatedWarning.messages) {
      const channel = await fetchChannel(
        message.channelId,
        ChannelType.GuildText
      )
      await channel.messages.edit(message.id, logMessage)
    }
  },
}
