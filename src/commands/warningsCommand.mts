import { BotError, GuildOnlyError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import { PermissionFlagsBits, SlashCommandUserOption } from "discord.js"

export const WarningsCommand = slashCommand({
  name: "warnings",
  description: "List a user's warnings",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  options: [
    slashOption(true, {
      option: new SlashCommandUserOption()
        .setName("user")
        .setDescription("The target user"),
    }),
  ],
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
