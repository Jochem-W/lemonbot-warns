import {
  Interaction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js"
import { CustomId, InteractionScope } from "../models/customId.mjs"
import { RegisteredCommands } from "../commands.mjs"
import type { Handler } from "../interfaces/handler.mjs"
import {
  CommandNotFoundByIdError,
  CommandNotFoundByNameError,
  NoMessageComponentHandlerError,
  reportError,
} from "../errors.mjs"
import { makeErrorEmbed } from "../utilities/responseBuilder.mjs"

export class InteractionHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  private static async handleMessageComponent(
    interaction: MessageComponentInteraction
  ): Promise<void> {
    const data = CustomId.fromString(interaction.customId)
    if (data.scope !== InteractionScope.Instance) {
      return
    }

    const command = RegisteredCommands.get(data.primary)
    if (!command) {
      throw new CommandNotFoundByNameError(data.primary)
    }

    if (!command.handleMessageComponent) {
      throw new NoMessageComponentHandlerError(command)
    }

    await command.handleMessageComponent(interaction, data)
  }

  private static async handleModalSubmit(
    interaction: ModalSubmitInteraction
  ): Promise<void> {
    const data = CustomId.fromString(interaction.customId)
    if (data.scope !== InteractionScope.Instance) {
      return
    }

    const command = RegisteredCommands.get(data.primary)
    if (!command) {
      throw new CommandNotFoundByIdError(data.primary)
    }

    if (!command.handleModalSubmit) {
      throw new NoMessageComponentHandlerError(command)
    }

    await command.handleModalSubmit(interaction, data)
  }

  public async handle(interaction: Interaction): Promise<void> {
    if (interaction instanceof MessageComponentInteraction) {
      try {
        await InteractionHandler.handleMessageComponent(interaction)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(interaction.client, e)
        await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
      }

      return
    }

    if (interaction instanceof ModalSubmitInteraction) {
      try {
        await InteractionHandler.handleModalSubmit(interaction)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(interaction.client, e)
        await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
      }

      return
    }
  }
}
