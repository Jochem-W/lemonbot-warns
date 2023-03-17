import { RegisteredCommands } from "../commands.mjs"
import {
  ButtonNotFoundError,
  CommandNotFoundByIdError,
  InvalidCustomIdError,
  ModalNotFoundError,
  NoMessageComponentHandlerError,
  reportError,
} from "../errors.mjs"
import { RegisteredButtons, RegisteredModals } from "../interactable.mjs"
import { InteractionScope, stringToCustomId } from "../models/customId.mjs"
import type { Handler } from "../types/handler.mjs"
import { makeErrorEmbed } from "../utilities/embedUtilities.mjs"
import { MessageComponentInteraction, ModalSubmitInteraction } from "discord.js"
import type { Interaction } from "discord.js"

export class InteractionHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  private static async handleMessageComponent(
    interaction: MessageComponentInteraction
  ) {
    const data = stringToCustomId(interaction.customId)
    switch (data.scope) {
      case InteractionScope.Button: {
        if (!interaction.isButton()) {
          throw new InvalidCustomIdError(data)
        }

        const button = RegisteredButtons.get(data.primary)
        if (!button) {
          throw new ButtonNotFoundError(data)
        }

        await button.handle(interaction, data)
        break
      }
      case InteractionScope.Instance: {
        const command = RegisteredCommands.get(data.primary)
        if (!command) {
          throw new CommandNotFoundByIdError(data.primary)
        }

        if (!command.handleMessageComponent) {
          throw new NoMessageComponentHandlerError(command)
        }

        await command.handleMessageComponent(interaction, data)
        break
      }
      default:
        break
    }
  }

  private static async handleModalSubmit(interaction: ModalSubmitInteraction) {
    const data = stringToCustomId(interaction.customId)
    switch (data.scope) {
      case InteractionScope.Modal: {
        const modal = RegisteredModals.get(data.primary)
        if (!modal) {
          throw new ModalNotFoundError(data)
        }

        await modal.handle(interaction, data)
        break
      }
      case InteractionScope.Instance: {
        const command = RegisteredCommands.get(data.primary)
        if (!command) {
          throw new CommandNotFoundByIdError(data.primary)
        }

        if (!command.handleModalSubmit) {
          throw new NoMessageComponentHandlerError(command)
        }

        await command.handleModalSubmit(interaction, data)
        break
      }
      default:
        break
    }
  }

  public async handle(interaction: Interaction) {
    if (interaction instanceof MessageComponentInteraction) {
      try {
        await InteractionHandler.handleMessageComponent(interaction)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(e)
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

        await reportError(e)
        await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
      }

      return
    }
  }
}
