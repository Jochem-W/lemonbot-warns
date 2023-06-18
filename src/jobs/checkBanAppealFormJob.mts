import { Discord, Forms, Prisma } from "../clients.mjs"
import { InvalidDateTimeError, logError } from "../errors.mjs"
import { warningsMessage } from "../messages/warningsMessage.mjs"
import { Config } from "../models/config.mjs"
import {
  fetchChannel,
  userDisplayName,
} from "../utilities/discordUtilities.mjs"
import {
  getFirstTextAnswer,
  getFormEditUrl,
} from "../utilities/googleForms.mjs"
import { CronJob } from "cron"
import {
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  GuildBan,
  hyperlink,
  RESTJSONErrorCodes,
  time,
  TimestampStyles,
  type Snowflake,
} from "discord.js"
import { DateTime } from "luxon"

async function findBans(userId: Snowflake) {
  const results: GuildBan[] = []
  const guilds = await Prisma.warningGuild.findMany()
  for (const prismaGuild of guilds) {
    const guild = await Discord.guilds.fetch(prismaGuild.id)
    try {
      results.push(await guild.bans.fetch(userId))
    } catch (e) {
      if (
        !(e instanceof DiscordAPIError) ||
        e.code !== RESTJSONErrorCodes.UnknownBan
      ) {
        throw e
      }
    }
  }

  return results
}

async function onTick() {
  const end = DateTime.now().toUTC().startOf("minute")
  const start = end.minus({ minutes: 1 })
  const timestamp = start.toISO()
  if (timestamp === null) {
    throw new InvalidDateTimeError(start)
  }

  const response = await Forms.forms.responses.list({
    formId: Config.banAppealForm.id,
    filter: `timestamp >= ${timestamp}`,
  })

  if (!response.data.responses) {
    return
  }

  for (const formResponse of response.data.responses) {
    let submittedTime
    if (formResponse.lastSubmittedTime) {
      submittedTime = DateTime.fromISO(formResponse.lastSubmittedTime)
    }

    submittedTime ??= DateTime.now()

    if (submittedTime.diff(end).toMillis() >= 0) {
      return
    }

    const notes: string[] = []

    const userId = getFirstTextAnswer(
      formResponse,
      Config.banAppealForm.questions.discordId
    )
    const user = await Discord.users.fetch(userId)

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${userDisplayName(user)} responded to the ban appeal form`,
        iconURL: user.displayAvatarURL(),
      })
      .setTitle("View full response")
      .setURL(
        getFormEditUrl(
          Config.banAppealForm.id,
          formResponse.responseId
        ).toString()
      )
      .setTimestamp(submittedTime.toMillis())

    const contactMethod = getFirstTextAnswer(
      formResponse,
      Config.banAppealForm.questions.contactMethod
    )
    let contact
    switch (contactMethod) {
      case "Email":
        contact = "redacted"
        break
      case "Twitter":
        contact = getFirstTextAnswer(
          formResponse,
          Config.banAppealForm.questions.twitterUsername
        )
        contact = hyperlink(
          `@${contact}`,
          new URL(contact, "https://twitter.com/")
        )
        break
      default:
        contact = "unknown"
        break
    }
    embed.addFields({
      name: "How should we contact you about your appeal?",
      value: `${contactMethod} (${contact})`,
    })

    const claimedBanDate = getFirstTextAnswer(
      formResponse,
      Config.banAppealForm.questions.banDate,
      false
    )
    embed.addFields({
      name: "When were you banned?",
      value: claimedBanDate
        ? time(
            DateTime.fromISO(claimedBanDate).toJSDate(),
            TimestampStyles.ShortDate
          )
        : "Not provided",
    })

    const claimedBanReason = getFirstTextAnswer(
      formResponse,
      Config.banAppealForm.questions.banReason
    )
    embed.addFields({
      name: "Why were you banned?",
      value:
        claimedBanReason.length > 1024
          ? `${claimedBanReason.slice(undefined, 1021)}...`
          : claimedBanReason,
    })

    const bans = await findBans(user.id)
    if (bans.length > 0) {
      embed.addFields({
        name: "Audit log ban reasons",
        value: bans
          .map((b) => `${b.reason ?? "N/A"} (${b.guild.name})`)
          .join("\n"),
      })
    } else {
      notes.push("• The user isn't actually banned")
    }

    const unbanReason = getFirstTextAnswer(
      formResponse,
      Config.banAppealForm.questions.unbanReason,
      false
    )
    if (unbanReason) {
      embed.addFields({
        name: "Why should you be unbanned?",
        value:
          unbanReason.length > 1024
            ? `${unbanReason.slice(undefined, 1021)}...`
            : unbanReason,
      })
    }

    embed.setDescription(notes.join("\n") || null)

    let loggingGuilds = await Promise.all(
      bans.map((b) =>
        Prisma.warningGuild.findFirstOrThrow({ where: { id: b.guild.id } })
      )
    )
    if (loggingGuilds.length === 0) {
      loggingGuilds = await Prisma.warningGuild.findMany()
    }

    for (const prismaGuild of loggingGuilds) {
      const appealsChannel = await fetchChannel(
        prismaGuild.appealsChannel,
        ChannelType.GuildText
      )
      const message = await appealsChannel.send({
        embeds: [embed],
      })
      const thread = await message.startThread({
        name: `${userDisplayName(user)}'s ban appeal`,
        reason: "Create thread for more coherent discussion",
      })

      for (const message of await warningsMessage(user)) {
        await thread.send(message)
      }
    }
  }
}

export const CheckBanAppealFormJob = new CronJob("* * * * *", () => {
  onTick().catch((e) => {
    if (e instanceof Error) {
      void logError(e)
    }
  })
})
