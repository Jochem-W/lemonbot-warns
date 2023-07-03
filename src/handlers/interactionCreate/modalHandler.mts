import { logError, UnregisteredNameError } from "../../errors.mjs"
import { RegisteredModals } from "../../interactable.mjs"
import { InteractionScope, stringToCustomId } from "../../models/customId.mjs"
import { handler } from "../../models/handler.mjs"
import { makeErrorEmbed } from "../../utilities/embedUtilities.mjs"
import { ModalSubmitInteraction, type Interaction } from "discord.js"

async function handleModalSubmit(interaction: ModalSubmitInteraction) {
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

export const ModalHandler = handler({
  event: "interactionCreate",
  once: false,
  async handle(interaction: Interaction) {
    if (!interaction.isModalSubmit()) {
      return
    }

    try {
      await handleModalSubmit(interaction)
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e
      }

      await logError(e, interaction.guild ?? interaction.guildId)
      await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
    }

    return
  },
})
