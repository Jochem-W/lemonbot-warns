import { AuditLogNotFoundError, InvalidAuditLogEntryError } from "../errors.mjs"
import type { Handler } from "../interfaces/handler.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/responseBuilder.mjs"
import { AuditLogEvent, ChannelType, GuildBan } from "discord.js"

export class GuildBanRemoveHandler implements Handler<"guildBanRemove"> {
  public readonly event = "guildBanRemove"
  public readonly once = false

  private static async getAuditLogEntry(ban: GuildBan) {
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

  public async handle(ban: GuildBan) {
    console.log("guildBanRemove event dispatched", ban)

    const loggingChannel = await fetchChannel(
      ban.guild,
      DefaultConfig.guild.warnLogsChannel,
      ChannelType.GuildText
    )

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await GuildBanRemoveHandler.getAuditLogEntry(ban)
    if (!auditLogEntry.executor) {
      throw new InvalidAuditLogEntryError("Audit log entry has no executor")
    }

    if (auditLogEntry.executor.id === ban.client.user.id) {
      console.log("Unbanned by self, ignoring")
      return
    }

    await loggingChannel.send({
      embeds: [
        makeEmbed(
          `Unbanned ${ban.user.tag}`,
          new URL(ban.user.displayAvatarURL())
        )
          .setFields(
            {
              name: "Reason",
              value: auditLogEntry.reason?.trim() ?? "N/A",
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
  }
}
