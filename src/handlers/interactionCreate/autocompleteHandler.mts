import { RegisteredCommands } from "../../commands.mjs"
import {
  CommandNotFoundByIdError,
  NoAutocompleteHandlerError,
} from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import type { Interaction } from "discord.js"

export class AutocompleteHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  public async handle(interaction: Interaction) {
    if (!interaction.isAutocomplete()) {
      return
    }

    const command = RegisteredCommands.get(interaction.commandId)
    if (!command) {
      throw new CommandNotFoundByIdError(interaction.commandId)
    }

    if (!command.handleAutocomplete) {
      throw new NoAutocompleteHandlerError(command)
    }

    await interaction.respond(await command.handleAutocomplete(interaction))
  }
}
