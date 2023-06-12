import { BotError, GuildOnlyError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { UserContextMenuCommand } from "../models/userContextMenuCommand.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import {
  PermissionFlagsBits,
  UserContextMenuCommandInteraction,
} from "discord.js"

export class WarningsContextCommand extends UserContextMenuCommand {
  public constructor() {
    super("List warnings", PermissionFlagsBits.ModerateMembers)
  }

  public async handle(interaction: UserContextMenuCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const ephemeral = !(await isInPrivateChannel(interaction))

    const messages = await warningsMessage(interaction.targetUser)

    if (!messages[0]) {
      throw new BotError("Response has 0 messages")
    }

    await interaction.reply({ ...messages[0], ephemeral })
    for (const message of messages.slice(1)) {
      await interaction.followUp({ ...message, ephemeral })
    }
  }
}
