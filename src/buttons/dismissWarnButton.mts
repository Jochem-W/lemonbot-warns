import { Discord } from "../clients.mjs"
import { ChannelNotFoundError, InvalidCustomIdError } from "../errors.mjs"
import { registerButtonHandler } from "../utilities/button.mjs"
import { EmbedBuilder } from "discord.js"

export const DismissWarnButton = registerButtonHandler(
  "dismiss-warn",
  async (interaction, [channelId, userId]) => {
    if (!channelId || !userId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Something went wrong while handling this interaction")
            .setDescription("You can't use this component!"),
        ],
        ephemeral: true,
      })
      return
    }

    const channel = await Discord.channels.fetch(channelId)
    if (!channel) {
      throw new ChannelNotFoundError(channelId)
    }

    await channel.delete()
    await interaction.deferUpdate()
  }
)
