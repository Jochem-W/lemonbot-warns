import { reportError, UnregisteredNameError } from "../../errors.mjs"
import { RegisteredModals } from "../../interactable.mjs"
import { InteractionScope, stringToCustomId } from "../../models/customId.mjs"
import type { Handler } from "../../types/handler.mjs"
import { makeErrorEmbed } from "../../utilities/embedUtilities.mjs"
import { ModalSubmitInteraction } from "discord.js"
import type { Interaction } from "discord.js"

export class ModalHandler implements Handler<"interactionCreate"> {
  public readonly event = "interactionCreate"
  public readonly once = false

  private async handleModalSubmit(interaction: ModalSubmitInteraction) {
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
    if (!interaction.isModalSubmit()) {
      return
    }

    try {
      await this.handleModalSubmit(interaction)
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
