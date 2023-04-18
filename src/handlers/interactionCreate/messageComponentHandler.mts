import {
  ButtonNotFoundError,
  InvalidCustomIdError,
  reportError,
} from "../../errors.mjs"
import { RegisteredButtons } from "../../interactable.mjs"
import { InteractionScope, stringToCustomId } from "../../models/customId.mjs"
import type { Handler } from "../../types/handler.mjs"
import { makeErrorEmbed } from "../../utilities/embedUtilities.mjs"
import { MessageComponentInteraction } from "discord.js"
import type { Interaction } from "discord.js"

export class MessageComponentHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  private async handleMessageComponent(
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

  public async handle(interaction: Interaction) {
    if (!interaction.isMessageComponent()) {
      return
    }

    try {
      await this.handleMessageComponent(interaction)
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
