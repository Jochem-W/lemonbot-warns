import { RegisteredCommands } from "../../commands.mjs"
import {
  CommandNotFoundByIdError,
  NoPermissionError,
  reportError,
} from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import { makeErrorEmbed } from "../../utilities/embedUtilities.mjs"
import { CommandInteraction } from "discord.js"
import type { Interaction } from "discord.js"

async function handleCommand(interaction: CommandInteraction) {
  const command = RegisteredCommands.get(interaction.commandId)
  if (!command) {
    throw new CommandNotFoundByIdError(interaction.commandId)
  }

  if (
    command.builder.default_member_permissions &&
    !interaction.memberPermissions?.has(
      BigInt(command.builder.default_member_permissions),
      true
    )
  ) {
    throw new NoPermissionError()
  }

  await command.handle(interaction)
}

export const CommandHandler: Handler<"interactionCreate"> = {
  event: "interactionCreate",
  once: false,
  async handle(interaction: Interaction) {
    if (!interaction.isCommand()) {
      return
    }

    try {
      await handleCommand(interaction)
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e
      }

      await reportError(e)
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
      } else {
        await interaction.reply({
          embeds: [makeErrorEmbed(e)],
          ephemeral: true,
        })
      }
    }

    return
  },
}
