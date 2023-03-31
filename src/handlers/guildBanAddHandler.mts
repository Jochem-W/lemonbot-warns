import { EditWarnButton } from "../buttons/editWarnButton.mjs"
import { Prisma } from "../clients.mjs"
import { AuditLogNotFoundError, InvalidAuditLogEntryError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Handler } from "../types/handler.mjs"
import { button } from "../utilities/button.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import {
  ActionRowBuilder,
  AuditLogEvent,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  GuildBan,
} from "discord.js"

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

    const reason = auditLogEntry.reason?.trim()
    if (reason?.includes("Account was less than 30 days old")) {
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
      },
    }

    if (reason) {
      args.data.description = reason
    }

    const prismaBan = await Prisma.warning.create(args)

    const message = await loggingChannel.send({
      embeds: [
        makeEmbed(
          `Banned ${ban.user.tag} [${prismaBan.id}] (No DM)`,
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
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents([
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Edit description")
            .setCustomId(button(EditWarnButton, [prismaBan.id.toString()])),
        ]),
      ],
    })

    await Prisma.warning.update({
      where: { id: prismaBan.id },
      data: { messageId: message.id },
    })
  }
}
