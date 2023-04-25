import { Prisma } from "../../clients.mjs"
import {
  AuditLogNotFoundError,
  InvalidAuditLogEntryError,
} from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { makeEmbed } from "../../utilities/embedUtilities.mjs"
import { AuditLogEvent, ChannelType, GuildBan } from "discord.js"

async function getAuditLogEntry(ban: GuildBan) {
  const auditLogs = await ban.guild.fetchAuditLogs({
    type: AuditLogEvent.MemberBanRemove,
    limit: 10,
  })

  for (const [, entry] of auditLogs.entries) {
    if (entry.target?.id === ban.user.id) {
      return entry
    }
  }

  throw new AuditLogNotFoundError(
    `Couldn't find an audit log entry for ban target ${ban.user.id}`
  )
}

export const LogUnbans: Handler<"guildBanRemove"> = {
  event: "guildBanRemove",
  once: false,
  async handle(ban: GuildBan) {
    const prismaGuild = await Prisma.warningGuild.findFirst({
      where: { id: ban.guild.id },
    })
    if (!prismaGuild) {
      return
    }

    const warnLogsChannel = await fetchChannel(
      prismaGuild.warnLogsChannel,
      ChannelType.GuildText
    )

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await getAuditLogEntry(ban)
    if (!auditLogEntry.executor) {
      throw new InvalidAuditLogEntryError("Audit log entry has no executor")
    }

    if (auditLogEntry.executor.id === ban.client.user.id) {
      return
    }

    const reason = auditLogEntry.reason?.trim()
    if (reason === "Account is now 30 days old") {
      return
    }

    await warnLogsChannel.send({
      embeds: [
        makeEmbed(
          `Unbanned ${ban.user.tag}`,
          new URL(ban.user.displayAvatarURL())
        )
          .setFields(
            {
              name: "Reason",
              value: reason ?? "N/A",
            },
            {
              name: "User ID",
              value: ban.user.id,
            }
          )
          .setFooter({
            text: `Unbanned by ${auditLogEntry.executor.tag}`,
            iconURL: auditLogEntry.executor.displayAvatarURL(),
          }),
      ],
    })
  },
}
