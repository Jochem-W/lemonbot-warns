import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { CustomId } from "../models/customId.mjs"
import type { Modal } from "../types/modal.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import type { ModalSubmitInteraction } from "discord.js"

export class EditWarnModal implements Modal {
  public readonly name = "edit-warn"

  public async handle(interaction: ModalSubmitInteraction, customId: CustomId) {
    if (!customId.secondary) {
      throw new InvalidCustomIdError(customId)
    }

    const oldWarning = await Prisma.warning.findFirstOrThrow({
      where: { id: parseInt(customId.secondary) },
    })
    const warning = await Prisma.warning.update({
      where: {
        id: oldWarning.id,
      },
      data: {
        description: interaction.fields.getTextInputValue("description"),
      },
    })

    await interaction.reply({
      embeds: [
        makeEmbed("Warning edited", DefaultConfig.icons.success).addFields(
          { name: "Old description", value: oldWarning.description ?? "-" },
          { name: "New description", value: warning.description ?? "-" }
        ),
      ],
      ephemeral: !isInPrivateChannel(interaction),
    })
  }
}
