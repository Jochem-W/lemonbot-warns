import { Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { searchMessage } from "../messages/searchMessage.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import { isInPrivateChannel } from "../utilities/discordUtilities.mjs"
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandStringOption,
} from "discord.js"
import { LRUCache } from "lru-cache"
import { nanoid } from "nanoid"

export const WarningsCache = new LRUCache<
  string,
  Parameters<typeof searchMessage>[2]
>({
  max: 20,
})

export const SearchCommand = slashCommand({
  name: "search",
  description: "Search through all warning descriptions (W.I.P.)",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  dmPermission: false,
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

    const warningMessages: Parameters<typeof searchMessage>[2] = []
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

    const key = nanoid()
    WarningsCache.set(key, warningMessages)

    await interaction.editReply(
      await searchMessage(interaction.client, key, warningMessages, 0)
    )
  },
})
