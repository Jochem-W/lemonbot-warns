import { RegisteredCommands } from "../commands.mjs"
import {
  CommandNotFoundByIdError,
  NoAutocompleteHandlerError,
  NoPermissionError,
  reportError,
} from "../errors.mjs"
import type { Handler } from "../types/handler.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import { makeErrorEmbed } from "../utilities/embedUtilities.mjs"
import {
  AutocompleteInteraction,
  CommandInteraction,
  Interaction,
} from "discord.js"

export class CommandHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  private static async handleAutocomplete(
    interaction: AutocompleteInteraction
  ) {
    const command = RegisteredCommands.get(interaction.commandId)
    if (!command) {
      throw new CommandNotFoundByIdError(interaction.commandId)
    }

    if (!command.handleAutocomplete) {
      throw new NoAutocompleteHandlerError(command)
    }

    await interaction.respond(await command.handleAutocomplete(interaction))
  }

  private static async handleCommand(interaction: CommandInteraction) {
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

  public async handle(interaction: Interaction) {
    if (interaction instanceof AutocompleteInteraction) {
      await CommandHandler.handleAutocomplete(interaction)
      return
    }

    if (interaction instanceof CommandInteraction) {
      await interaction.deferReply({
        ephemeral: !isInPrivateChannel(interaction),
      })
      try {
        await CommandHandler.handleCommand(interaction)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(e)
        await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
      }

      return
    }
  }
}
