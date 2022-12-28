import {ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, Snowflake, User} from "discord.js"
import {ChatInputCommand} from "../models/chatInputCommand"
import {Prisma} from "../clients"
import {stringify} from "csv"
import archiver, {Archiver} from "archiver"
import {DateTime} from "luxon"
import {isFromOwner} from "../utilities/interactionUtilities"
import {NoMessageRevisionsError, OwnerOnlyError, reportError} from "../errors"
import {createWriteStream} from "fs"
import {unlink} from "fs/promises"

export class StatisticsCommand extends ChatInputCommand {
    public constructor() {
        super("statistics", "Get statistics about the usage of the bot", PermissionFlagsBits.Administrator)
        this.builder.addBooleanOption(option => option
            .setName("public-only")
            .setDescription("Limit message history to public channels only"))
    }

    private static async addWarningStatistics(archive: Archiver, interaction: ChatInputCommandInteraction) {
        const data = (await Prisma.warning.findMany({
            select: {
                createdAt: true,
                createdBy: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        })).map(warning => ({
            createdBy: warning.createdBy,
            createdAt: DateTime.fromJSDate(warning.createdAt, {zone: "utc"}),
        }))

        const users: Record<Snowflake, User> = {}
        for (const warning of data) {
            if (warning.createdBy in users) {
                continue
            }

            users[warning.createdBy] = await interaction.client.users.fetch(warning.createdBy)
        }

        let cursor = data[0]?.createdAt.startOf("day")
        if (!cursor) {
            return
        }

        const series: Record<Snowflake, { date: string, count: number }[]> = {}
        while (cursor.diffNow("days").days < 0) {
            const warnings = data.filter(warning => warning.createdAt.hasSame(cursor as DateTime, "day"))

            for (const user of Object.values(users)) {
                let count = warnings.filter(warning => warning.createdBy === user.id).length
                series[user.tag] ??= []

                const last = series[user.tag]?.at(-1)
                if (last) {
                    count += last.count
                }

                series[user.tag]?.push({date: cursor.toISODate(), count})
            }

            cursor = cursor.plus({days: 1})
        }

        for (const user in series) {
            archive.append(stringify(series[user] ?? [], {columns: ["date", "count"], header: true}),
                {name: `warnings/${user}.csv`})
        }
    }

    private static async addMessageStatistics(archive: Archiver, interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            return
        }

        const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId)

        const roleIds: Snowflake[] = []
        for (const [id, role] of await guild.roles.fetch()) {
            if (role.permissions.has(PermissionFlagsBits.ModerateMembers, true)) {
                roleIds.push(id)
            }
        }

        const channelIds: Snowflake[] = []
        for (const [id, channel] of await guild.channels.fetch()) {
            const permissions = channel?.permissionsFor(guild.roles.everyone, true)
            if (permissions?.has(PermissionFlagsBits.ViewChannel)) {
                channelIds.push(id)
            }
        }

        let data = []
        const members: Record<Snowflake, GuildMember> = {}
        for (const [id, member] of await guild.members.fetch()) {
            if (member.user.bot || !member.roles.cache.hasAny(...roleIds)) {
                continue
            }

            members[id] = member

            data.push(...(await Prisma.message.findMany({
                where: {
                    userId: id,
                },
                include: {
                    revisions: {
                        take: 1,
                    },
                },
            })).map(message => {
                const revision = message.revisions[0]
                if (!revision) {
                    throw new NoMessageRevisionsError(message.id)
                }

                return {
                    userId: message.userId,
                    channelId: message.channelId,
                    timestamp: DateTime.fromJSDate(revision.timestamp, {zone: "utc"}),
                }
            }))
        }

        if (interaction.options.getBoolean("public-only")) {
            data = data.filter(message => channelIds.includes(message.channelId))
        }

        data.sort((a, b) => {
            return a.timestamp.toMillis() - b.timestamp.toMillis()
        })

        let cursor = data[0]?.timestamp.startOf("day")
        if (!cursor) {
            return
        }

        const series: Record<Snowflake, { date: string, count: number }[]> = {}
        while (cursor.diffNow("days").days < 0) {
            const warnings = data.filter(message => message.timestamp.hasSame(cursor as DateTime, "day"))

            for (const member of Object.values(members)) {
                let count = warnings.filter(message => message.userId === member.id).length
                series[member.user.tag] ??= []

                const last = series[member.user.tag]?.at(-1)
                if (last) {
                    count += last.count
                }

                series[member.user.tag]?.push({date: cursor.toISODate(), count})
            }

            cursor = cursor.plus({days: 1})
        }

        for (const user in series) {
            archive.append(stringify(series[user] ?? [], {columns: ["date", "count"], header: true}),
                {name: `messages/${user}.csv`})
        }
    }

    public async handle(interaction: ChatInputCommandInteraction) {
        if (!await isFromOwner(interaction)) {
            throw new OwnerOnlyError()
        }

        const fileName = `${interaction.id}.zip`
        const output = createWriteStream(fileName)
        const archive = archiver("zip", {zlib: {level: 9}})

        output.on("close", () => {
            interaction.editReply({
                files: [{
                    attachment: fileName,
                    name: "statistics.zip",
                }],
            }).catch(e => {
                if (e instanceof Error) {
                    void reportError(interaction.client, e)
                } else {
                    console.log(e)
                }
            }).finally(() => {
                unlink(fileName).catch(e => {
                    if (e instanceof Error) {
                        void reportError(interaction.client, e)
                    } else {
                        console.log(e)
                    }
                })
            })
        })

        archive.on("warning", err => void reportError(interaction.client, err))
        archive.on("error", err => void reportError(interaction.client, err))

        archive.pipe(output)

        await StatisticsCommand.addWarningStatistics(archive, interaction)
        await StatisticsCommand.addMessageStatistics(archive, interaction)

        await archive.finalize()
    }
}