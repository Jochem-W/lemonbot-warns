import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import {
  customIdToString,
  InteractionScope,
  stringToCustomId,
} from "../models/customId.mjs"
import { InteractionCollectorHelper } from "../models/interactionCollectorHelper.mjs"
import { fetchGuild } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  inlineCode,
  PermissionFlagsBits,
  time,
} from "discord.js"
import type { MessageActionRowComponentBuilder } from "discord.js"
import { DateTime } from "luxon"

type ResponseOptions = {
  bans: string[]
  page: number
  pageLimit: number
}

export class CheckBansCommand extends ChatInputCommand {
  public constructor() {
    super(
      "check-bans",
      "Check banned users",
      PermissionFlagsBits.ModerateMembers
    )
  }

  public static buildResponse(options: ResponseOptions) {
    const offset = options.page * options.pageLimit
    const lastPage = Math.ceil(options.bans.length / options.pageLimit) - 1

    return {
      embeds: [
        makeEmbed(
          "Auto-banned users",
          DefaultConfig.icons.success,
          `The following ${options.bans.length.toString()} auto-banned users have an account older than 30 days:`,
          options.bans.slice(offset, offset + options.pageLimit).join("\n") ||
            undefined
        ),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(
              customIdToString({
                scope: InteractionScope.Collector,
                primary: "previous",
              })
            )
            .setDisabled(options.page === 0)
            .setEmoji("⬅️"),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId(
              customIdToString({
                scope: InteractionScope.Collector,
                primary: "next",
              })
            )
            .setDisabled(options.page >= lastPage)
            .setEmoji("➡️"),
        ]),
      ],
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const guild = await fetchGuild(interaction)

    const bans: string[] = []
    for (const [, ban] of await guild.bans.fetch()) {
      if (ban.reason !== "Account was less than 30 days old") {
        continue
      }

      const createdDate = DateTime.fromMillis(ban.user.createdTimestamp)
      if (DateTime.now().diff(createdDate).as("days") < 30) {
        continue
      }

      bans.push(
        `• ${inlineCode(ban.user.tag)} (created ${time(
          Math.floor(createdDate.toSeconds()),
          "R"
        )})`
      )
    }

    let page = 0

    const collector = await InteractionCollectorHelper.create(interaction)
    collector.addListener(async (collected) => {
      if (!collected.isButton()) {
        console.error(
          "Unhandled interaction",
          collected,
          "in collector for command",
          this
        )
        return
      }

      const customId = stringToCustomId(collected.customId)
      switch (customId.primary) {
        case "next":
          page++
          break
        case "previous":
          page--
          break
      }

      await collected.update(
        CheckBansCommand.buildResponse({
          bans: bans,
          page: page,
          pageLimit: 25,
        })
      )
    })

    const response = CheckBansCommand.buildResponse({
      bans: bans,
      page: page,
      pageLimit: 25,
    })

    await interaction.editReply(response)
    collector.updateComponents(response.components)
  }
}
