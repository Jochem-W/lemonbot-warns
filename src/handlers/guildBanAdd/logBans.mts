import { Prisma } from "../../clients.mjs"
import {
  AuditLogNotFoundError,
  InvalidAuditLogEntryError,
} from "../../errors.mjs"
import { warnLogMessage } from "../../messages/warnLogMessage.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { AuditLogEvent, ChannelType, GuildBan } from "discord.js"

async function getAuditLogEntry(ban: GuildBan) {
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

export const LogBans: Handler<"guildBanAdd"> = {
  event: "guildBanAdd",
  once: false,
  async handle(ban: GuildBan) {
    const prismaGuild = await Prisma.warningGuild.findFirst({
      where: { id: ban.guild.id },
    })
    if (!prismaGuild) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await getAuditLogEntry(ban)
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
        guild: { connect: { id: ban.guild.id } },
      },
    }

    if (auditLogReason) {
      args.data.description = auditLogReason
    }

    const prismaBan = await Prisma.warning.create({
      ...args,
      include: { penalty: true, reasons: true, images: true, guild: true },
    })

    const warnLogsChannel = await fetchChannel(
      prismaGuild.warnLogsChannel,
      ChannelType.GuildText
    )
    const message = await warnLogsChannel.send(await warnLogMessage(prismaBan))

    await Prisma.warning.update({
      where: { id: prismaBan.id },
      data: { messageId: message.id },
    })
  },
}
