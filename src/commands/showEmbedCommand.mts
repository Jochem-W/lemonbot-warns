import { Prisma } from "../clients.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { warnMessage } from "../messages/warnMessage.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import {
  PermissionFlagsBits,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
} from "discord.js"

export const ShowEmbedCommand = slashCommand({
  name: "show",
  description: "Show various warning embeds",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  dmPermission: false,
  options: [
    slashOption(
      true,
      new SlashCommandIntegerOption()
        .setName("id")
        .setDescription("The warning ID"),
    ),
    slashOption(
      true,
      new SlashCommandStringOption()
        .setName("type")
        .setDescription("The embed type")
        .setChoices({ name: "Log", value: "log" }, { name: "DM", value: "dm" }),
    ),
  ],
  async handle(interaction, id, type) {
    const warning = await Prisma.warning.findFirstOrThrow({
      where: { id },
      include: {
        penalty: true,
        images: true,
        guild: true,
        messages: true,
      },
    })
    let ephemeral = true
    if (interaction.inGuild()) {
      const warningGuild = await Prisma.warningGuild.findFirst({
        where: { id: interaction.guildId },
      })
      ephemeral = warningGuild?.warnLogsChannel !== interaction.channelId
    }
    switch (type) {
      case "warn-dm":
        await interaction.reply({
          ...(await warnMessage(interaction.client, warning)),
          ephemeral,
        })
        break
      case "warn-log":
        await interaction.reply({
          ...(await warnLogMessage(interaction.client, warning)),
          ephemeral,
        })
        break
      default:
        throw new Error("Invalid type")
    }
  },
})
