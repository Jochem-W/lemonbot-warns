import { Discord, Prisma } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import archiver from "archiver"
import type { Archiver } from "archiver"
import { stringify } from "csv-stringify"
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  User,
} from "discord.js"
import type { Snowflake } from "discord.js"
import { createWriteStream } from "fs"
import { unlink } from "fs/promises"
import { DateTime } from "luxon"

export class StatisticsCommand extends ChatInputCommand {
  public constructor() {
    super(
      "statistics",
      "Get statistics about the usage of the bot",
      PermissionFlagsBits.Administrator
    )
    this.builder.addBooleanOption((option) =>
      option
        .setName("public-only")
        .setDescription("Limit message history to public channels only")
    )
  }

  private async addWarningStatistics(archive: Archiver) {
    const data = (
      await Prisma.warning.findMany({
        select: {
          createdAt: true,
          createdBy: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      })
    ).map((warning) => ({
      createdBy: warning.createdBy,
      createdAt: DateTime.fromJSDate(warning.createdAt, { zone: "utc" }),
    }))

    const users = new Map<Snowflake, User>()
    for (const warning of data) {
      if (users.has(warning.createdBy)) {
        continue
      }

      users.set(warning.createdBy, await Discord.users.fetch(warning.createdBy))
    }

    if (!data[0]) {
      return
    }

    let cursor = data[0].createdAt.startOf("day")

    const series = new Map<Snowflake, { date: string; count: number }[]>()
    while (cursor.diffNow("days").days < 0) {
      const warnings = data.filter((warning) =>
        warning.createdAt.hasSame(cursor, "day")
      )

      for (const user of users.values()) {
        let count = warnings.filter(
          (warning) => warning.createdBy === user.id
        ).length
        let value = series.get(user.tag)
        if (!value) {
          value = []
          series.set(user.tag, value)
        }

        const last = value.at(-1)
        if (last) {
          count += last.count
        }

        const date = cursor.toISODate()
        if (!date) {
          continue
        }

        value.push({ date, count })
      }

      cursor = cursor.plus({ days: 1 })
    }

    for (const user of series.keys()) {
      archive.append(
        stringify(series.get(user) ?? [], {
          columns: ["date", "count"],
          header: true,
        }),
        { name: `warnings/${user}.csv` }
      )
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)
    await interaction.deferReply({ ephemeral: true })

    const fileName = `${interaction.id}.zip`
    const output = createWriteStream(fileName)
    const archive = archiver("zip", { zlib: { level: 9 } })

    output.on("close", () => {
      interaction
        .editReply({
          files: [
            {
              attachment: fileName,
              name: "statistics.zip",
            },
          ],
        })
        .catch((e) => {
          if (e instanceof Error) {
            void logError(e, interaction.guild ?? interaction.guildId)
          } else {
            console.log(e)
          }
        })
        .finally(() => {
          unlink(fileName).catch((e) => {
            if (e instanceof Error) {
              void logError(e, interaction.guild ?? interaction.guildId)
            } else {
              console.log(e)
            }
          })
        })
    })

    archive.on(
      "warning",
      (err) => void logError(err, interaction.guild ?? interaction.guildId)
    )
    archive.on(
      "error",
      (err) => void logError(err, interaction.guild ?? interaction.guildId)
    )

    archive.pipe(output)

    await this.addWarningStatistics(archive)

    await archive.finalize()
  }
}
