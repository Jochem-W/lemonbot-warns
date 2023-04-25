import {
  ButtonNotFoundError,
  InvalidCustomIdError,
  logError,
} from "../../errors.mjs"
import { RegisteredButtons } from "../../interactable.mjs"
import { InteractionScope, stringToCustomId } from "../../models/customId.mjs"
import type { Handler } from "../../types/handler.mjs"
import { makeErrorEmbed } from "../../utilities/embedUtilities.mjs"
import { MessageComponentInteraction } from "discord.js"
import type { Interaction } from "discord.js"

async function handleMessageComponent(
  interaction: MessageComponentInteraction
) {
  const data = stringToCustomId(interaction.customId)
  if (data.scope !== InteractionScope.Button) {
    return
  }

  if (!interaction.isButton()) {
    throw new InvalidCustomIdError(interaction.customId)
  }

  const button = RegisteredButtons.get(data.name)
  if (!button) {
    throw new ButtonNotFoundError(data.name)
  }

  await button(interaction, data.args)
}

export const MessageComponentHandler: Handler<"interactionCreate"> = {
  event: "interactionCreate",
  once: false,
  async handle(interaction: Interaction) {
    if (!interaction.isMessageComponent()) {
      return
    }

    try {
      await handleMessageComponent(interaction)
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e
      }

      await logError(e, interaction.guild ?? interaction.guildId)
      await interaction.editReply({ embeds: [makeErrorEmbed(e)] })
    }

    return
  },
}
