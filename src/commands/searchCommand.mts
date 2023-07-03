import { Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { searchMessage } from "../messages/searchMessage.mjs"
import { stringToCustomId } from "../models/customId.mjs"
import { InteractionCollectorHelper } from "../models/interactionCollectorHelper.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandStringOption,
} from "discord.js"

export const SearchCommand = slashCommand({
  name: "search",
  description: "Search through all warning descriptions (W.I.P.)",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  options: [
    slashOption(
      true,
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("Search query")
    ),
  ],
  async handle(interaction, search) {
    await interaction.deferReply({
      ephemeral: !(await isInPrivateChannel(interaction)),
    })

    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const warnings = await Prisma.warning.findMany({
      where: {
        description: {
          search,
        },
      },
      include: {
        penalty: true,
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const warningMessages: Parameters<typeof searchMessage>[0] = []
    for (const warning of warnings) {
      const embeds = warning.images.map((image) =>
        new EmbedBuilder().setImage(image.url)
      )

      let firstEmbed = embeds.at(0)
      if (!firstEmbed) {
        firstEmbed = new EmbedBuilder()
        embeds.push(firstEmbed)
      }

      firstEmbed
        .setDescription(warning.description)
        .setTimestamp(warning.createdAt)

      warningMessages.push({ embeds, warning })
    }

    let skip = 0
    const collector = await InteractionCollectorHelper.create(interaction)
    collector.addListener(async (collected) => {
      if (!collected.isButton()) {
        return
      }

      const customId = stringToCustomId(collected.customId)
      switch (customId.name) {
        case "next":
          skip++
          break
        case "previous":
          skip--
          break
      }

      await collected.update(await searchMessage(warningMessages, skip))
    })

    await interaction.editReply(await searchMessage(warningMessages, skip))
  },
})
