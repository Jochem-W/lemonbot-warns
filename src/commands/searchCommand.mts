import { Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { CustomId, InteractionScope } from "../models/customId.mjs"
import { InteractionCollectorHelper } from "../models/interactionCollectorHelper.mjs"
import { WarnCommand } from "./warnCommand.mjs"
import type { Warning, Penalty, Reason } from "@prisma/client"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  MessageActionRowComponentBuilder,
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

  private static calculateStart(
    messages: { embeds: EmbedBuilder[] }[],
    page: number
  ) {
    let start = 0

    for (let i = 0; i < page; i++) {
      let length = 0
      let take = 0
      for (const message of messages) {
        const newLength = length + message.embeds.length
        if (newLength > 2 && length !== 0) {
          break
        }

        length += message.embeds.length
        take += 1
      }

      start += take
      messages = messages.slice(take)
    }

    return start
  }

  private static async buildResponse(
    guild: Guild,
    warnings: {
      embeds: EmbedBuilder[]
      warning: Warning & { penalty: Penalty; reasons: Reason[] }
    }[],
    page: number
  ) {
    const total = warnings.length
    const start = SearchCommand.calculateStart(warnings, page)
    warnings = warnings.slice(start)

    let end = start
    const embeds: EmbedBuilder[] = []
    for (const warning of warnings) {
      const newLength = embeds.length + warning.embeds.length
      if (newLength > 2 && embeds.length !== 0) {
        break
      }

      const user = await guild.client.users.fetch(warning.warning.userId)
      const warnedBy = await guild.client.users.fetch(warning.warning.createdBy)
      warning.embeds[0]?.setAuthor({
        name: `${WarnCommand.formatTitle(
          {
            penalty: warning.warning.penalty,
            notify: !warning.warning.silent,
            guild: guild,
            warnedBy: warnedBy,
            reasons: warning.warning.reasons.map((reason) => reason.name),
          },
          {
            verbOnly: true,
          }
        )} ${user.tag}`,
        iconURL: user.displayAvatarURL(),
      })

      warning.embeds.at(-1)?.setFooter({
        text: `${WarnCommand.formatTitle({
          penalty: warning.warning.penalty,
          notify: !warning.warning.silent,
          guild: guild,
          warnedBy: warnedBy,
          reasons: warning.warning.reasons.map((reason) => reason.name),
        })}`,
        iconURL: warnedBy.displayAvatarURL(),
      })

      embeds.push(...warning.embeds)
      end++
    }

    return {
      embeds,
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(
              new CustomId(
                InteractionScope.Collector,
                "previous",
                "",
                []
              ).toString()
            )
            .setDisabled(start === 0)
            .setEmoji("⬅️"),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(
              new CustomId(
                InteractionScope.Collector,
                "next",
                "",
                []
              ).toString()
            )
            .setDisabled(end >= total)
            .setEmoji("➡️"),
        ]),
      ],
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const guild =
      interaction.guild ??
      (await interaction.client.guilds.fetch(interaction.guildId))

    const warnings = await Prisma.warning.findMany({
      where: {
        description: {
          search: interaction.options.getString("query", true),
        },
      },
      include: {
        penalty: true,
        reasons: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const warningMessages: Parameters<typeof SearchCommand.buildResponse>[1] =
      []
    for (const warning of warnings) {
      const embeds = warning.images.map((image) =>
        new EmbedBuilder().setImage(image)
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

      const customId = CustomId.fromString(collected.customId)
      switch (customId.primary) {
        case "next":
          skip++
          break
        case "previous":
          skip--
          break
      }

      await collected.update(
        await SearchCommand.buildResponse(guild, warningMessages, skip)
      )
    })

    await interaction.editReply(
      await SearchCommand.buildResponse(guild, warningMessages, skip)
    )
  }
}
