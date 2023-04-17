import { Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { searchMessage } from "../messages/searchMessage.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { stringToCustomId } from "../models/customId.mjs"
import { InteractionCollectorHelper } from "../models/interactionCollectorHelper.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js"

export class SearchCommand extends ChatInputCommand {
  public constructor() {
    super(
      "search",
      "Search through all warning descriptions (W.I.P.)",
      PermissionFlagsBits.ModerateMembers
    )
    this.builder.addStringOption((option) =>
      option.setName("query").setDescription("Search query").setRequired(true)
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: !isInPrivateChannel(interaction),
    })

    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const warnings = await Prisma.warning.findMany({
      where: {
        description: {
          search: interaction.options.getString("query", true),
        },
      },
      include: {
        penalty: true,
        reasons: true,
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
  }
}
