import { BotError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { UserContextMenuCommand } from "../models/userContextMenuCommand.mjs"
import {
  isInPrivateChannel,
  tryFetchMember,
} from "../utilities/discordUtilities.mjs"
import {
  PermissionFlagsBits,
  UserContextMenuCommandInteraction,
} from "discord.js"

export class WarningsContextCommand extends UserContextMenuCommand {
  public constructor() {
    super("List warnings", PermissionFlagsBits.ModerateMembers)
  }

  public async handle(interaction: UserContextMenuCommandInteraction) {
    const ephemeral = !isInPrivateChannel(interaction)

    const member = await tryFetchMember(interaction.targetUser)

    const messages = await warningsMessage(member ?? interaction.targetUser)

    if (!messages[0]) {
      throw new BotError("Response has 0 messages")
    }

    await interaction.reply({ ...messages[0], ephemeral })
    for (const message of messages.slice(1)) {
      await interaction.followUp({ ...message, ephemeral })
    }
  }
}
