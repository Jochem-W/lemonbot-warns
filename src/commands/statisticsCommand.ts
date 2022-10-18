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


        const data: Record<Snowflake, DateTime[]> = {}
        for (const [, member] of await guild.members.fetch()) {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.user.bot) {
                continue
            }

            data[member.id] = []
            for await (const {Key} of search(Variables.s3ArchiveBucketName, `users/${member.id}`)) {
                const messageId = Key?.split("/").pop()
                if (!messageId) {
                    continue
                }

                data[member.id]?.push(snowflakeToDateTime(messageId).startOf("day"))
            }
        }

        for (const user in data) {
            data[user]?.sort((a, b) => a.diff(b).milliseconds)
        }

        const sortedDates = Object.values(data).flat().sort((a, b) => a.diff(b).milliseconds)
        const firstDate = sortedDates[0]
        const lastDate = sortedDates.at(-1)

        if (!firstDate || !lastDate) {
            return
        }

        for (const [user, messageDates] of Object.entries(data)) {
            const member = await guild.members.fetch(user)

            let cursor = firstDate
            while (cursor.diffNow("days").days < 0) {
                let count = 0
                while (messageDates[0]?.hasSame(cursor, "day")) {
                    count++
                    messageDates.shift()
                }

                series[member.user.tag] ??= []
                series[member.user.tag]?.push({date: cursor.toISODate(), count})
                cursor = cursor.plus({days: 1})
            }
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