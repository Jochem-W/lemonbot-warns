import { Discord } from "../clients.mjs"
import { ChannelNotFoundError, InvalidCustomIdError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { registerButtonHandler } from "../utilities/button.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"

export const DismissWarnButton = registerButtonHandler(
  "dismiss-warn",
  async (interaction, [channelId, userId]) => {
    if (!channelId || !userId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    if (interaction.user.id !== userId) {
      await interaction.reply({
        embeds: [
          makeEmbed(
            "Something went wrong while handling this interaction",
            DefaultConfig.icons.fail,
            "You can't use this component!"
          ),
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
