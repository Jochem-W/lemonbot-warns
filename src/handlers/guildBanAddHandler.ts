import type {Handler} from "../interfaces/handler"
import {AuditLogEvent, ChannelType, chatInputApplicationCommandMention, GuildBan, userMention} from "discord.js"
import {Prisma} from "../clients"
import {DefaultConfig} from "../models/config"
import {makeEmbed} from "../utilities/responseBuilder"
import {ChannelNotFoundError, CommandNotFoundError, InvalidChannelTypeError} from "../errors"
import {RegisteredCommands, SlashCommands} from "../commands"
import {WarnCommand} from "../commands/warnCommand"

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
        const warnCommand = SlashCommands.find(c => c instanceof WarnCommand)
        const commandId = warnCommand ?
            RegisteredCommands.findKey(c => c.builder.name === warnCommand.builder.name) :
            null
        if (!warnCommand || !commandId) {
            throw new CommandNotFoundError("Couldn't find an instance of WarnCommand")
        }

        const loggingChannel = await ban.client.channels.fetch(DefaultConfig.guild.warnLogsChannel)
        if (!loggingChannel) {
            throw new ChannelNotFoundError(DefaultConfig.guild.warnLogsChannel)
        }

        if (!loggingChannel.isTextBased()) {
            throw new InvalidChannelTypeError(loggingChannel, ChannelType.GuildText)
        }

        const auditLogEntry = await GuildBanAddHandler.getAuditLogEntry(ban)
        if (!auditLogEntry?.executor || auditLogEntry.executor === ban.client.user) {
            return
        }

        const reason = auditLogEntry.reason?.trim()
        if (reason?.includes("Account was less than 30 days old")) {
            return
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

        await Prisma.warning.create({
            data: {
                createdAt: auditLogEntry.createdAt,
                createdBy: auditLogEntry.executor.id,
                description: reason,
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
                `If you're going to use a bot, please use ${chatInputApplicationCommandMention(warnCommand.builder.name,
                    commandId)} from ${userMention(ban.client.user.id)} instead...`
        }

        await loggingChannel.send({
            embeds: [
                makeEmbed(`Banned ${ban.user.tag} without warning`, new URL(ban.user.displayAvatarURL()))
                    .setDescription(description || null)
                    .setFields({
                        name: "Reason",
                        value: reason ?? "N/A :(",
                    })
                    .setFooter({
                        text: `Banned by ${auditLogEntry.executor.tag}`,
                        iconURL: auditLogEntry.executor.displayAvatarURL(),
                    }),
            ],
        })
    }
}