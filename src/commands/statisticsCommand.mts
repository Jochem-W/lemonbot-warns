import { Discord, Prisma } from "../clients.mjs"
import { NoMessageRevisionsError, reportError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import archiver from "archiver"
import type { Archiver } from "archiver"
import { stringify } from "csv"
import {
  ChatInputCommandInteraction,
  GuildMember,
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

  private static async addWarningStatistics(archive: Archiver) {
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

        value.push({ date: cursor.toISODate(), count })
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

  private static async addMessageStatistics(
    archive: Archiver,
    interaction: ChatInputCommandInteraction
  ) {
    if (!interaction.inGuild()) {
      return
    }

    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))

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
    const members = new Map<Snowflake, GuildMember>()
    for (const [id, member] of await guild.members.fetch()) {
      if (member.user.bot || !member.roles.cache.hasAny(...roleIds)) {
        continue
      }

      members.set(id, member)

      data.push(
        ...(
          await Prisma.message.findMany({
            where: {
              userId: id,
            },
            include: {
              revisions: {
                take: 1,
              },
            },
          })
        ).map((message) => {
          const revision = message.revisions[0]
          if (!revision) {
            throw new NoMessageRevisionsError(message.id)
          }

          return {
            userId: message.userId,
            channelId: message.channelId,
            timestamp: DateTime.fromJSDate(revision.timestamp, { zone: "utc" }),
          }
        })
      )
    }

    if (interaction.options.getBoolean("public-only")) {
      data = data.filter((message) => channelIds.includes(message.channelId))
    }

    data.sort((a, b) => {
      return a.timestamp.toMillis() - b.timestamp.toMillis()
    })

    if (!data[0]) {
      return
    }

    let cursor = data[0].timestamp.startOf("day")

    const series = new Map<Snowflake, { date: string; count: number }[]>()
    while (cursor.diffNow("days").days < 0) {
      const warnings = data.filter((message) =>
        message.timestamp.hasSame(cursor, "day")
      )

      for (const member of members.values()) {
        let count = warnings.filter(
          (message) => message.userId === member.id
        ).length
        let value = series.get(member.user.tag)
        if (!value) {
          value = []
          series.set(member.user.tag, value)
        }

        const last = value.at(-1)
        if (last) {
          count += last.count
        }

        value.push({ date: cursor.toISODate(), count })
      }

      cursor = cursor.plus({ days: 1 })
    }

    for (const user of series.keys()) {
      archive.append(
        stringify(series.get(user) ?? [], {
          columns: ["date", "count"],
          header: true,
        }),
        { name: `messages/${user}.csv` }
      )
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

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
            void reportError(e)
          } else {
            console.log(e)
          }
        })
        .finally(() => {
          unlink(fileName).catch((e) => {
            if (e instanceof Error) {
              void reportError(e)
            } else {
              console.log(e)
            }
          })
        })
    })

    archive.on("warning", (err) => void reportError(err))
    archive.on("error", (err) => void reportError(err))

    archive.pipe(output)

    await StatisticsCommand.addWarningStatistics(archive)
    await StatisticsCommand.addMessageStatistics(archive, interaction)

    await archive.finalize()
  }
}
