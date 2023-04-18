import { Discord } from "../../clients.mjs"
import { DefaultConfig } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { ChannelType, GuildMember } from "discord.js"
import type { PartialGuildMember } from "discord.js"

export class DeleteWarnChannelOnLeave implements Handler<"guildMemberRemove"> {
  public readonly event = "guildMemberRemove"
  public readonly once = false

  public async handle(member: GuildMember | PartialGuildMember) {
    const user = await Discord.users.fetch(member.id)

    const warnCategory = await fetchChannel(
      DefaultConfig.guild.warnCategory,
      ChannelType.GuildCategory,
      { force: true }
    )

    for (const [, channel] of await warnCategory.guild.channels.fetch()) {
      if (
        channel?.parent !== warnCategory ||
        channel.type !== ChannelType.GuildText
      ) {
        continue
      }

      const messages = await channel.messages.fetch({ limit: 1 })
      if (
        messages.some(
          (message) =>
            message.author.id === member.client.user.id &&
            message.mentions.has(user)
        )
      ) {
        await channel.delete()
        break
      }
    }
  }
}
