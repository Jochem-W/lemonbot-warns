import { AuditLogNotFoundError, InvalidAuditLogEntryError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../types/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
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
    const discussionChannel = await fetchChannel(
      DefaultConfig.guild.discussionChannel,
      ChannelType.GuildText
    )

    const threadsManager = discussionChannel.threads
    let fetchedThreads
    do {
      fetchedThreads = await threadsManager.fetchActive()
      for (const [, thread] of fetchedThreads.threads) {
        if (thread.name.includes(ban.user.id)) {
          await thread.setArchived(true, "User was unbanned")
          await thread.setLocked(
            true,
            "Ban appeal thread should remain archived"
          )
        }
      }
    } while (fetchedThreads.hasMore)

    const loggingChannel = await fetchChannel(
      DefaultConfig.guild.warnLogsChannel,
      ChannelType.GuildText
    )

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await GuildBanRemoveHandler.getAuditLogEntry(ban)
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

    await loggingChannel.send({
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
  }
}
