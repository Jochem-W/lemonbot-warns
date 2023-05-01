import { Discord } from "../clients.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { Variables } from "../variables.mjs"
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js"
import { Duration } from "luxon"

export class StatusCommand extends ChatInputCommand {
  public constructor() {
    super(
      "status",
      "Display ping and uptime",
      PermissionFlagsBits.ModerateMembers
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle("Status").setFields(
          {
            name: "Ping",
            value: `${Discord.ws.ping}ms`,
          },
          {
            name: "Uptime",
            value: Duration.fromObject({
              ...Duration.fromMillis(process.uptime() * 1000)
                .rescale()
                .toObject(),
              milliseconds: undefined,
              millisecond: undefined,
            }).toHuman(),
          },
          {
            name: "Version",
            value: Variables.commitHash ?? "unknown",
          }
        ),
      ],
    })
  }
}
