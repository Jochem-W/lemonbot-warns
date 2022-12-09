import type {Handler} from "../interfaces/handler"
import {AuditLogEvent, ChannelType, GuildBan, userMention} from "discord.js"
import {Prisma} from "../clients"
import {DefaultConfig} from "../models/config"
import {makeEmbed} from "../utilities/responseBuilder"
import {ChannelNotFoundError, InvalidChannelTypeError} from "../errors"

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

        return null
    }

    public async handle(ban: GuildBan) {
        if (ban.reason === "Account was less than 30 days") {
            return
        }

        const loggingChannel = await ban.client.channels.fetch(DefaultConfig.guild.warnLogsChannel)
        if (!loggingChannel) {
            throw new ChannelNotFoundError(DefaultConfig.guild.warnLogsChannel)
        }

        if (!loggingChannel.isTextBased()) {
            throw new InvalidChannelTypeError(loggingChannel, ChannelType.GuildText)
        }

        const penalty = await Prisma.penalty.findFirst({
            where: {
                ban: true,
            },
        })

        if (!penalty) {
            return
        }

        const warning = await Prisma.warning.findFirst({
            where: {
                user: {
                    discordId: ban.user.id,
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
            return
        }

        const auditLogEntry = await GuildBanAddHandler.getAuditLogEntry(ban)
        if (!auditLogEntry?.executor || auditLogEntry.executor === ban.client.user) {
            return
        }

        await Prisma.warning.create({
            data: {
                createdAt: auditLogEntry.createdAt,
                createdBy: auditLogEntry.executor.id,
                description: ban.reason,
                silent: true,
                penalty: {
                    connect: {
                        id: penalty.id,
                    },
                },
                user: {
                    connectOrCreate: {
                        where: {
                            discordId: ban.user.id,
                        },
                        create: {
                            discordId: ban.user.id,
                            priority: false,
                        },
                    },
                },
            },
        })

        let description = ""
        if (auditLogEntry.executor.bot) {
            description +=
                `If you're going to use a command, please use /warn from ${userMention(ban.client.user.id)} instead...`
        }

        if (!ban.reason) {
            if (description) {
                description += "Oh, and setting a ban reason would be useful too :)"
            } else {
                description += "Please set a reason if you're going to ban manually."
            }
        }

        await loggingChannel.send({
            content: userMention("869602709920174110"),
            embeds: [
                makeEmbed(`Added ban for ${ban.user.tag}`, new URL(auditLogEntry.executor.displayAvatarURL()))
                    .setDescription(description),
            ],
        })
    }
}