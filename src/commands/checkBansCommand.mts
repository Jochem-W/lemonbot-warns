import { Discord } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"

export class CheckBansCommand extends ChatInputCommand {
  public constructor() {
    super(
      "check-bans",
      "Check banned users",
      PermissionFlagsBits.ModerateMembers
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const data = []

    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
    for (const [, ban] of await guild.bans.fetch()) {
      if (ban.reason === "Account was less than 30 days old") {
        data.push(ban.user.toJSON())
      }
    }

    const json = JSON.stringify(data, undefined, 4)

    await interaction.editReply({
      files: [new AttachmentBuilder(Buffer.from(json), { name: "data.json" })],
    })
  }
}
