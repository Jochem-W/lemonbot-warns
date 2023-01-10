import { Google } from "../clients.mjs"
import { reportError } from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import type { FormsResponsesList } from "../utilities/googleForms.mjs"
import {
  getFirstTextAnswer,
  getFormEditUrl,
} from "../utilities/googleForms.mjs"
import { CronJob } from "cron"
import {
  ChannelType,
  Client,
  DiscordAPIError,
  EmbedBuilder,
  Guild,
  hyperlink,
  RESTJSONErrorCodes,
  TextChannel,
  time,
  TimestampStyles,
} from "discord.js"
import { DateTime } from "luxon"

export class CheckBanAppealFormJob {
  private static discussionChannel: TextChannel
  private static guild: Guild
  private static job = new CronJob("* * * * *", async () => {
    try {
      await CheckBanAppealFormJob.onTick()
    } catch (e) {
      if (e instanceof Error) {
        await reportError(CheckBanAppealFormJob.guild.client, e)
      }
    }
  })

  public static async configure(client: Client) {
    CheckBanAppealFormJob.guild = await client.guilds.fetch(
      DefaultConfig.guild.id
    )
    CheckBanAppealFormJob.discussionChannel = await fetchChannel(
      CheckBanAppealFormJob.guild,
      DefaultConfig.guild.discussionChannel,
      ChannelType.GuildText
    )
  }

  public static start() {
    CheckBanAppealFormJob.job.start()
  }

  public static stop() {
    CheckBanAppealFormJob.job.stop()
  }

  private static async onTick() {
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
      const user = await CheckBanAppealFormJob.guild.client.users.fetch(userId)

      const userTag = getFirstTextAnswer(
        formResponse,
        DefaultConfig.banAppealForm.questions.discordTag
      )
      if (userTag !== user.tag) {
        notes.push(
          "• The tag filled in by the user doesn't match the tag of the account with the ID they filled in"
        )
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${user.tag} responded to the ban appeal form`,
          iconURL: user.displayAvatarURL(),
        })
        .setTitle("View full response")
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
        const ban = await CheckBanAppealFormJob.guild.bans.fetch(user.id)
        embed.addFields({
          name: "Audit log ban reason",
          value: ban.reason || "N/A",
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

      await CheckBanAppealFormJob.discussionChannel.send({ embeds: [embed] })
    }
  }
}
