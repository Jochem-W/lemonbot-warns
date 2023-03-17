import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError } from "../errors.mjs"
import { customIdToString, InteractionScope } from "../models/customId.mjs"
import type { CustomId } from "../models/customId.mjs"
import type { Button } from "../types/button.mjs"
import { ButtonInteraction, TextInputStyle } from "discord.js"
import type { ModalActionRowComponentBuilder } from "discord.js"
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "discord.js"

export class EditWarnButton implements Button {
  public readonly name = "edit-warn"

  public async handle(interaction: ButtonInteraction, customId: CustomId) {
    if (!customId.secondary) {
      throw new InvalidCustomIdError(customId)
    }

    const warning = await Prisma.warning.findFirstOrThrow({
      where: {
        id: parseInt(customId.secondary),
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
        .setCustomId(
          customIdToString({
            scope: InteractionScope.Modal,
            primary: "edit-warn",
            secondary: customId.secondary,
          })
        )
        .setTitle("Edit warning description")
        .setComponents(
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            input
          )
        )
    )
  }
}
