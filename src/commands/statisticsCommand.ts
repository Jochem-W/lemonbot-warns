import {ChatInputCommandInteraction, PermissionFlagsBits, Snowflake, User} from "discord.js"
import {ChatInputCommand} from "../models/chatInputCommand"
import {Prisma} from "../clients"
import {stringify} from "csv"
import archiver, {Archiver} from "archiver"
import {DateTime} from "luxon"
import {isFromOwner} from "../utilities/interactionUtilities"
import {OwnerOnlyError, reportError} from "../errors"
import {createWriteStream} from "fs"
import {unlink} from "fs/promises"

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

        await archive.finalize()
    }
}