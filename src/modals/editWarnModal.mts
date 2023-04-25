import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError, logError } from "../errors.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { DefaultConfig } from "../models/config.mjs"
import {
  fetchChannel,
  isInPrivateChannel,
} from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { registerModalHandler } from "../utilities/modal.mjs"
import { ChannelType } from "discord.js"

export const EditWarnModal = registerModalHandler(
  "edit-warn",
  async (interaction, [warningId]) => {
    if (!warningId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    const oldWarning = await Prisma.warning.findFirstOrThrow({
      where: { id: parseInt(warningId) },
    })
    const warning = await Prisma.warning.update({
      where: {
        id: oldWarning.id,
      },
      data: {
        description: interaction.fields.getTextInputValue("description"),
      },
      include: {
        penalty: true,
        reasons: true,
        images: true,
        guild: true,
        messages: true,
      },
    })

    const reply = await interaction.reply({
      embeds: [
        makeEmbed("Warning edited", DefaultConfig.icons.success).addFields(
          { name: "Old description", value: oldWarning.description ?? "-" },
          { name: "New description", value: warning.description ?? "-" }
        ),
      ],
      ephemeral: !(await isInPrivateChannel(interaction)),
    })

    setTimeout(() => void reply.delete().catch(logError), 2500)

    const logMessage = await warnLogMessage(warning)
    for (const message of warning.messages) {
      const channel = await fetchChannel(
        message.channelId,
        ChannelType.GuildText
      )
      await channel.messages.edit(message.id, logMessage)
    }
  }
)
