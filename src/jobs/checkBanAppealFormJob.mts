import { Google } from "../clients.mjs"
import { WarningsCommand } from "../commands/warningsCommand.mjs"
import { reportError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import type { FormsResponsesList } from "../utilities/googleForms.mjs"
import {
  getFirstTextAnswer,
  getFormEditUrl,
} from "../utilities/googleForms.mjs"
import { makeEmbed } from "../utilities/responseBuilder.mjs"
import { CronJob } from "cron"
import {
  ChannelType,
  Client,
  DiscordAPIError,
  Guild,
  hyperlink,
  RESTJSONErrorCodes,
  TextChannel,
  time,
  TimestampStyles,
} from "discord.js"
import { DateTime } from "luxon"

export class CheckBanAppealFormJob {
  private readonly discussionChannel: TextChannel
  private readonly guild: Guild
  private readonly cronJob: CronJob

  private constructor(guild: Guild, discussionChannel: TextChannel) {
    this.guild = guild
    this.discussionChannel = discussionChannel
    this.cronJob = new CronJob("* * * * *", () => {
      CheckBanAppealFormJob.onTick(this).catch((e) => {
        if (e instanceof Error) {
          void reportError(guild.client, e)
        }
      })
    })
  }

  public static async create(client: Client) {
    const guild = await client.guilds.fetch(DefaultConfig.guild.id)
    const discussionChannel = await fetchChannel(
      guild,
      DefaultConfig.guild.discussionChannel,
      ChannelType.GuildText
    )

    return new CheckBanAppealFormJob(guild, discussionChannel)
  }

  public start() {
    this.cronJob.start()
  }

  public stop() {
    this.cronJob.stop()
  }

  private static async onTick(job: CheckBanAppealFormJob) {
    const end = DateTime.now().toUTC().startOf("minute")
    const start = end.minus({ minutes: 1 })

    const response = await Google.request<FormsResponsesList>({
      url: `https://forms.googleapis.com/v1/forms/1FUehfqF-wdpbPAlrCOusVmdnfmLIvGer52R35tA2JKU/responses?filter=timestamp >= ${start.toISO()}`,
    })

    if (!response.data.responses) {
      return
    }

    for (const formResponse of response.data.responses) {
      if (
        DateTime.fromISO(formResponse.lastSubmittedTime).diff(end).toMillis() >=
        0
      ) {
        return
      }

      const notes: string[] = []

      const userId = getFirstTextAnswer(
        formResponse,
        DefaultConfig.banAppealForm.questions.discordId
      )
      const user = await job.guild.client.users.fetch(userId)

      const userTag = getFirstTextAnswer(
        formResponse,
        DefaultConfig.banAppealForm.questions.discordTag
      )
      if (userTag !== user.tag) {
        notes.push(
          "• The tag filled in by the user doesn't match the tag of the account with the ID they filled in"
        )
      }

      const embed = makeEmbed(
        `${user.tag} responded to the ban appeal form`,
        new URL(user.displayAvatarURL()),
        "View full response"
      )
        .setURL(
          getFormEditUrl(
            DefaultConfig.banAppealForm.id,
            formResponse.responseId
          ).toString()
        )
        .setTimestamp(
          DateTime.fromISO(formResponse.lastSubmittedTime).toMillis()
        )

      let contactMethod = getFirstTextAnswer(
        formResponse,
        DefaultConfig.banAppealForm.questions.contactMethod
      )
      let contact
      switch (contactMethod) {
        case "Email":
          contactMethod = contactMethod.toLowerCase()
          contact = "redacted"
          break
        case "Twitter":
          contact = getFirstTextAnswer(
            formResponse,
            DefaultConfig.banAppealForm.questions.twitterUsername
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
        DefaultConfig.banAppealForm.questions.banDate,
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
        DefaultConfig.banAppealForm.questions.banReason
      )
      embed.addFields({
        name: "Why were you banned?",
        value:
          claimedBanReason.length > 1024
            ? `${claimedBanReason.slice(undefined, 1021)}...`
            : claimedBanReason,
      })

      try {
        const ban = await job.guild.bans.fetch(user.id)
        embed.addFields({
          name: "Audit log ban reason",
          value: ban.reason ?? "N/A",
        })
      } catch (e) {
        if (
          !(e instanceof DiscordAPIError) ||
          e.code !== RESTJSONErrorCodes.UnknownBan
        ) {
          throw e
        }

        notes.push("• The user isn't actually banned")
      }

      const unbanReason = getFirstTextAnswer(
        formResponse,
        DefaultConfig.banAppealForm.questions.unbanReason,
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

      const message = await job.discussionChannel.send({
        embeds: [embed],
      })
      const thread = await message.startThread({
        name: `${user.tag}'s ban appeal`,
        reason: "Create thread for more coherent discussion",
      })

      for (const message of await WarningsCommand.buildResponse(user)) {
        await thread.send(message)
      }
    }
  }
}
