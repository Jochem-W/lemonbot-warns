import type { Handler } from "../interfaces/handler.mjs"
import { ChannelType, GuildMember, PartialGuildMember } from "discord.js"
import { DefaultConfig } from "../models/config.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"

export class MemberRemoveHandler implements Handler<"guildMemberRemove"> {
  public readonly event = "guildMemberRemove"
  public readonly once = false

  public async handle(member: GuildMember | PartialGuildMember): Promise<void> {
    const user = await member.client.users.fetch(member.id)

    const warnCategory = await fetchChannel(
      member.guild,
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
