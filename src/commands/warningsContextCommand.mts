import { BotError, GuildOnlyError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { contextMenuCommand } from "../models/contextMenuCommand.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import { ApplicationCommandType, PermissionFlagsBits } from "discord.js"

export const WarningsContextCommand = contextMenuCommand({
  type: ApplicationCommandType.User,
  name: "List warnings",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  async handle(interaction, user) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const ephemeral = !(await isInPrivateChannel(interaction))

    const messages = await warningsMessage(user)
    if (!messages[0]) {
      throw new BotError("Response has 0 messages")
    }

    await interaction.reply({ ...messages[0], ephemeral })

    for (const message of messages.slice(1)) {
      await interaction.followUp({ ...message, ephemeral })
    }
  },
})
