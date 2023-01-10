import { Prisma } from "../clients.mjs"
import {
  AuditLogNotFoundError,
  InvalidAuditLogEntryError,
  PenaltyNotFoundError,
} from "../errors.mjs"
import type { Handler } from "../interfaces/handler.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/responseBuilder.mjs"
import { AuditLogEvent, bold, ChannelType, GuildBan } from "discord.js"

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
    console.log("guildBanAdd event dispatched", ban)

    const loggingChannel = await fetchChannel(
      ban.guild,
      DefaultConfig.guild.warnLogsChannel,
      ChannelType.GuildText
    )

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const auditLogEntry = await GuildBanAddHandler.getAuditLogEntry(ban)
    if (!auditLogEntry.executor) {
      throw new InvalidAuditLogEntryError("Audit log entry has no executor")
    }

    if (auditLogEntry.executor.id === ban.client.user.id) {
      console.log("Banned by self, ignoring")
      return
    }

    const reason = auditLogEntry.reason?.trim()
    if (reason?.includes("Account was less than 30 days old")) {
      console.log("Banned because of account age, ignoring")
      return
    }

    const penalty = await Prisma.penalty.findFirst({
      where: {
        ban: true,
      },
    })

    if (!penalty) {
      throw new PenaltyNotFoundError("Couldn't find a ban penalty")
    }

    const warning = await Prisma.warning.findFirst({
      where: {
        user: {
          id: ban.user.id,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      include: {
        penalty: true,
      },
    })

    if (warning?.penalty.ban) {
      console.log("User's latest warning is a ban, ignoring")
      // TODO: check time
      return
    }

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
      },
    }

    if (reason) {
      args.data.description = reason
    }

    const prismaBan = await Prisma.warning.create(args)
    await loggingChannel.send({
      embeds: [
        makeEmbed(
          `Banned ${ban.user.tag} [${prismaBan.id}] (${bold("No DM")})`,
          new URL(ban.user.displayAvatarURL())
        )
          .setFields(
            {
              name: "Reason",
              value: reason ?? "N/A :(",
            },
            {
              name: "User ID",
              value: ban.user.id,
            }
          )
          .setFooter({
            text: `Banned by ${auditLogEntry.executor.tag}`,
            iconURL: auditLogEntry.executor.displayAvatarURL(),
          }),
      ],
    })
  }
}
