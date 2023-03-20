import { Prisma } from "../clients.mjs"
import { InvalidCustomIdError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { registerModalHandler } from "../utilities/modal.mjs"

export const EditWarnModal = registerModalHandler(
  "edit-warn",
  async (interaction, [warningId]) => {
    if (!warningId) {
      throw new InvalidCustomIdError(interaction.customId)
    }

    const oldWarning = await Prisma.warning.findFirstOrThrow({
      where: { id: parseInt(warningId) },
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
)
