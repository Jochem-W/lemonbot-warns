import {ChatInputCommandInteraction, PermissionFlagsBits, Snowflake, User} from "discord.js"
import {ChatInputCommand} from "../models/chatInputCommand"
import {Prisma} from "../clients"
import {stringify} from "csv"
import archiver, {Archiver} from "archiver"
import {DateTime} from "luxon"
import {search} from "../utilities/s3Utilities"
import {Variables} from "../variables"
import {snowflakeToDateTime} from "../utilities/discordUtilities"
import {isFromOwner} from "../utilities/interactionUtilities"

export class StatisticsCommand extends ChatInputCommand {
    public constructor() {
        super("statistics", "Get statistics about the usage of the bot", PermissionFlagsBits.Administrator)
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
            await interaction.editReply("No data")
            return
        }

        const series: Record<Snowflake, { date: string, count: number }[]> = {}
        while (cursor.diffNow("days").days < 0) {
            const warnings = data.filter(warning => warning.createdAt.hasSame(cursor as DateTime, "day"))

            for (const user of Object.values(users)) {
                const count = warnings.filter(warning => warning.createdBy === user.id).length
                series[user.tag] ??= []
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
        if (!interaction.inGuild() || !await isFromOwner(interaction)) {
            return
        }

        const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId)
        const series: Record<string, { date: string, count: number }[]> = {}
        for (const [, member] of await guild.members.fetch()) {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                continue
            }

            const data: Record<string, number> = {}
            for await (const {Key} of search(Variables.s3ArchiveBucketName, `users/${member.id}`)) {
                const messageId = Key?.split("/").pop()
                if (!messageId) {
                    continue
                }

                const isoDate = snowflakeToDateTime(messageId).startOf("day").toISODate()
                data[isoDate] = (data[isoDate] ?? 0) + 1
            }

            series[member.user.tag] =
                Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({date, count}))
        }

        for (const user in series) {
            archive.append(stringify(series[user] ?? [], {columns: ["date", "count"], header: true}),
                {name: `messages/${user}.csv`})
        }
    }

    public async handle(interaction: ChatInputCommandInteraction) {
        const archive = archiver("tar", {gzip: true})

        await StatisticsCommand.addWarningStatistics(archive, interaction)
        await StatisticsCommand.addMessageStatistics(archive, interaction)

        await archive.finalize()
        await interaction.editReply({
            files: [{
                attachment: archive,
                name: "statistics.tar.gz",
            }],
        })
    }
}