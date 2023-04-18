import { Prisma } from "../../clients.mjs"
import {
  AuditLogNotFoundError,
  InvalidAuditLogEntryError,
} from "../../errors.mjs"
import { warnLogMessage } from "../../messages/warnLogMessage.mjs"
import { DefaultConfig } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { AuditLogEvent, ChannelType, GuildBan } from "discord.js"

const loggingChannel = await fetchChannel(
  DefaultConfig.guild.warnLogsChannel,
  ChannelType.GuildText
)

export class GuildBanAddHandler implements Handler<"guildBanAdd"> {
  public readonly event = "guildBanAdd"
  public readonly once = false

  private static async getAuditLogEntry(ban: GuildBan) {
    const auditLogs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
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
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await GuildBanAddHandler.getAuditLogEntry(ban)
    if (!auditLogEntry.executor) {
      throw new InvalidAuditLogEntryError("Audit log entry has no executor")
    }

    if (auditLogEntry.executor.id === ban.client.user.id) {
      return
    }

    const auditLogReason = auditLogEntry.reason?.trim()
    if (auditLogReason?.includes("Account was less than 30 days old")) {
      return
    }

    const penalty = await Prisma.penalty.findFirstOrThrow({
      where: {
        ban: true,
        hidden: true,
      },
    })

    const args: Parameters<typeof Prisma.warning.create>[0] = {
      data: {
        createdAt: auditLogEntry.createdAt,
        createdBy: auditLogEntry.executor.id,
        silent: true,
        penalty: {
          connect: {
            id: penalty.id,
          },
        },
        user: {
          connectOrCreate: {
            where: {
              id: ban.user.id,
            },
            create: {
              id: ban.user.id,
              priority: false,
            },
          },
        },
        penalised: "APPLIED",
        notified: "REGULAR_BAN",
      },
    }

    if (auditLogReason) {
      args.data.description = auditLogReason
    }

    const prismaBan = await Prisma.warning.create({
      ...args,
      include: { penalty: true, reasons: true, images: true },
    })

    const message = await loggingChannel.send(await warnLogMessage(prismaBan))

    await Prisma.warning.update({
      where: { id: prismaBan.id },
      data: { messageId: message.id },
    })
  }
}
