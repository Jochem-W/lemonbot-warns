import { BotError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { tryFetchMember } from "../utilities/discordUtilities.mjs"
import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import type { InteractionReplyOptions } from "discord.js"

export class WarningsCommand extends ChatInputCommand {
  public constructor() {
    super(
      "warnings",
      "List a user's warnings",
      PermissionFlagsBits.ModerateMembers
    )
    this.builder.addUserOption((option) =>
      option.setName("user").setDescription("Target user").setRequired(true)
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true)
    const member = await tryFetchMember(user)

    const messages = await warningsMessage(member ?? user)

    if (!messages[0]) {
      throw new BotError("Response has 0 messages")
    }

    await interaction.editReply(messages[0])
    for (const message of messages.slice(1)) {
      const options: InteractionReplyOptions = {
        ...message,
      }

      if (interaction.ephemeral) {
        options.ephemeral = true
      }

      await interaction.followUp(options)
    }
  }
}
