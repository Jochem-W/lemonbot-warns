import { Prisma } from "../../clients.mjs"
import { handler } from "../../models/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { ChannelType } from "discord.js"

export const DeleteWarnChannelOnLeave = handler({
  event: "guildMemberRemove",
  once: false,
  async handle(member) {
    const prismaGuild = await Prisma.warningGuild.findFirst({
      where: { id: member.guild.id },
    })
    if (!prismaGuild) {
      return
    }
    const user = await member.client.users.fetch(member.id)

    const warnCategory = await fetchChannel(
      member.client,
      prismaGuild.warnCategory,
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
  },
})
