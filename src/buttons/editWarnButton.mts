import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError } from "../errors.mjs"
import { EditWarnModal } from "../modals/editWarnModal.mjs"
import { registerButtonHandler } from "../utilities/button.mjs"
import { modal } from "../utilities/modal.mjs"
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import type { ModalActionRowComponentBuilder } from "discord.js"

export const EditWarnButton = registerButtonHandler(
  "edit-warn",
  async (interaction, [warningId]) => {
    if (!warningId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    const warning = await Prisma.warning.findFirstOrThrow({
      where: {
        id: parseInt(warningId),
      },
    })

    const input = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("New description")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
    if (warning.description) {
      input.setValue(warning.description)
    }

    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(modal(EditWarnModal, [warningId]))
        .setTitle("Edit warning description")
        .setComponents(
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            input
          )
        )
    )
  }
)
