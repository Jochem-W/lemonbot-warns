import {
  ButtonNotFoundError,
  InvalidCustomIdError,
  reportError,
  UnregisteredNameError,
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
    if (data.scope !== InteractionScope.Button) {
      return
    }

    if (!interaction.isButton()) {
      throw new InvalidCustomIdError(data)
    }

    const button = RegisteredButtons.get(data.name)
    if (!button) {
      throw new ButtonNotFoundError(data)
    }

    await button(interaction, data.args)
  }

  private static async handleModalSubmit(interaction: ModalSubmitInteraction) {
    const data = stringToCustomId(interaction.customId)
    if (data.scope !== InteractionScope.Modal) {
      return
    }

    const modal = RegisteredModals.get(data.name)
    if (!modal) {
      throw new UnregisteredNameError("modal", data.name)
    }

    await modal(interaction, data.args)
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
