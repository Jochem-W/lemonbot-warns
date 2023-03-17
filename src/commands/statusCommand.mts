import { Discord } from "../clients.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { Variables } from "../variables.mjs"
import {
  ChatInputCommandInteraction,
  inlineCode,
  PermissionFlagsBits,
} from "discord.js"
import { Duration } from "luxon"

type ResponseOptions = {
  ping: number
}

export class StatusCommand extends ChatInputCommand {
  public constructor() {
    super(
      "status",
      "Display ping and uptime",
      PermissionFlagsBits.ModerateMembers
    )
  }

  public static buildResponse(options: ResponseOptions) {
    const uptime = Duration.fromObject(
      Object.fromEntries(
        Object.entries(
          Duration.fromMillis(process.uptime() * 1000)
            .shiftTo("days", "hours", "minutes", "seconds")
            .normalize()
            .toObject()
        ).filter(([, value]) => value !== 0)
      )
    )

    return {
      embeds: [
        makeEmbed("Status", DefaultConfig.icons.success).setFields(
          {
            name: "Ping",
            value: inlineCode(`${options.ping}ms`),
          },
          {
            name: "Uptime",
            value: inlineCode(uptime.toHuman({ maximumFractionDigits: 0 })),
          },
          {
            name: "Version",
            value: inlineCode(Variables.commitHash ?? "unknown"),
          }
        ),
      ],
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await interaction.editReply(
      StatusCommand.buildResponse({ ping: Discord.ws.ping })
    )
  }
}
