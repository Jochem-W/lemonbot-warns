import { CronJob } from "cron"
import { DateTime, Duration } from "luxon"
import { Google } from "./clients.mjs"
import {
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  Guild,
  hyperlink,
  inlineCode,
  RESTJSONErrorCodes,
} from "discord.js"
import { DefaultConfig } from "./models/config.mjs"
import { fetchChannel } from "./utilities/discordUtilities.mjs"
import { reportError } from "./errors.mjs"
import type { FormResponsesList } from "./utilities/googleForms.mjs"
import {
  getFirstTextAnswer,
  getFormResponseUrl,
} from "./utilities/googleForms.mjs"

let checkBanAppealFormJob: CronJob | null = null

export async function checkBanAppealForm(guild: Guild) {
  if (checkBanAppealFormJob) {
    return checkBanAppealFormJob
  }

  const discussionChannel = await fetchChannel(
    guild,
    DefaultConfig.guild.discussionChannel,
    ChannelType.GuildText
  )

  checkBanAppealFormJob = new CronJob("* * * * *", async () => {
    try {
      const response = await Google.request({
        url: `https://forms.googleapis.com/v1/forms/1FUehfqF-wdpbPAlrCOusVmdnfmLIvGer52R35tA2JKU/responses?filter=timestamp >= ${DateTime.now()
          .startOf("minute")
          .minus(Duration.fromObject({ minutes: 1 }))
          .toUTC()
          .toISO()}`,
      })

      const data = response.data as FormResponsesList
      if (!data.responses) {
        return
      }

      for (const formResponse of data.responses) {
        const notes: string[] = []

        const userId = getFirstTextAnswer(
          formResponse,
          DefaultConfig.banAppealForm.questions.discordId
        )
        const user = await guild.client.users.fetch(userId)

        const userTag = getFirstTextAnswer(
          formResponse,
          DefaultConfig.banAppealForm.questions.discordTag
        )
        if (user.tag !== userTag) {
          notes.push(
            "• The tag filled in by the user doesn't match the tag of the account with the ID they filled in"
          )
        }

        try {
          const ban = await guild.bans.fetch(user.id)
          if (ban.reason) {
            notes.push(`• Audit log: ${inlineCode(ban.reason)}`)
          }
        } catch (e) {
          if (
            !(e instanceof DiscordAPIError) ||
            e.code !== RESTJSONErrorCodes.UnknownBan
          ) {
            throw e
          }

          notes.push("• The user isn't actually banned")
        }

        let contactMethod = getFirstTextAnswer(
          formResponse,
          DefaultConfig.banAppealForm.questions.contactMethod
        )
        let contactInfo
        switch (contactMethod) {
          case "Twitter": {
            const twitterUsername = getFirstTextAnswer(
              formResponse,
              DefaultConfig.banAppealForm.questions.twitterUsername
            )
            contactInfo = hyperlink(
              `@${twitterUsername}`,
              new URL(twitterUsername, "https://twitter.com/")
            )
            break
          }
          case "Email":
            // Respect privacy by not showing email
            contactMethod = contactMethod.toLowerCase()
            contactInfo = "redacted"
            break
          default:
            contactInfo = "unknown"
            break
        }

        notes.push(`• Contact via ${contactMethod} (${contactInfo})`)

        const embed = new EmbedBuilder()
          .setAuthor({
            name: `${user.tag} responded to the ban appeal form`,
            iconURL: user.displayAvatarURL(),
          })
          .setTitle("View the response")
          .setFields({
            name: "Notes",
            value: notes.join("\n") ?? "N/A",
          })
          .setURL(
            getFormResponseUrl(
              DefaultConfig.banAppealForm.id,
              formResponse.responseId
            ).toString()
          )
          .setTimestamp(
            DateTime.fromISO(formResponse.lastSubmittedTime).toMillis()
          )

        await discussionChannel.send({ embeds: [embed] })
      }
    } catch (e) {
      if (e instanceof Error) {
        await reportError(guild.client, e)
      }
    }
  })

  return checkBanAppealFormJob
}
