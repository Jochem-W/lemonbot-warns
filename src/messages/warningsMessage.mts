import { Prisma } from "../clients.mjs"
import { userDisplayName, warningUrl } from "../utilities/discordUtilities.mjs"
import { comparePenalty } from "../utilities/penaltyUtilities.mjs"
import { EmbedBuilder, time, TimestampStyles, User } from "discord.js"

export async function warningsMessage(user: User) {
  const prismaUser = await Prisma.user.findFirst({
    where: { id: user.id },
    include: {
      warnings: {
        include: {
          penalty: true,
          images: true,
          guild: true,
          messages: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  const summaryEmbed = new EmbedBuilder().setAuthor({
    name: `Warnings for ${userDisplayName(user)}`,
    iconURL: user.displayAvatarURL(),
  })

  if (!prismaUser || prismaUser.warnings.length === 0) {
    summaryEmbed.setTitle("This user has no logged warnings")
    return [{ embeds: [summaryEmbed] }]
  }

  const lastWarning = prismaUser.warnings.at(-1)
  if (lastWarning) {
    summaryEmbed.setFields(
      { name: "User ID", value: prismaUser.id },
      {
        name: "Most recent penalty",
        value: `${lastWarning.penalty.name} (${time(
          lastWarning.createdAt,
          TimestampStyles.RelativeTime
        )})`,
      }
    )
  }

  let highestPenaltyWarning = null

  let message = { embeds: [summaryEmbed] }
  const messages = [message]
  for (const warning of prismaUser.warnings) {
    if (
      comparePenalty(warning.penalty, highestPenaltyWarning?.penalty ?? null) >=
      0
    ) {
      highestPenaltyWarning = warning
    }

    let verb
    if (warning.penalty.ban) {
      verb = "Banned"
    } else if (warning.penalty.kick) {
      verb = "Kicked"
    } else if (warning.penalty.timeout) {
      verb = "Timed out"
    } else {
      verb = "Warned"
    }

    const createdBy = await user.client.users.fetch(warning.createdBy)

    const warningEmbeds = warning.images
      .filter((i) => !i.extra)
      .map((i) =>
        new EmbedBuilder()
          .setImage(i.url)
          .setURL(warningUrl(warning).toString())
      )

    const extraImages = warning.images
      .filter((i) => i.extra)
      .map((i) =>
        new EmbedBuilder()
          .setImage(i.url)
          .setURL(warningUrl(warning, "extra").toString())
      )

    extraImages[0]?.setAuthor({ name: "Extra images" })

    warningEmbeds.push(...extraImages)

    let warningInfoEmbed = warningEmbeds[0]
    if (!warningInfoEmbed) {
      warningInfoEmbed = new EmbedBuilder()
      warningEmbeds.push(warningInfoEmbed)
    }

    let title = `${verb} by ${userDisplayName(createdBy)} `

    title += time(warning.createdAt, TimestampStyles.RelativeTime)

    warningInfoEmbed
      .setTitle(title)
      .setDescription(warning.description)
      .setFooter({ text: warning.id.toString() })
      .setTimestamp(warning.createdAt)

    if (message.embeds.length + warningEmbeds.length > 10) {
      message = { embeds: warningEmbeds }
      messages.push(message)
      continue
    }

    message.embeds.push(...warningEmbeds)
  }

  if (highestPenaltyWarning) {
    summaryEmbed.addFields({
      name: "Highest penalty",
      value: `${highestPenaltyWarning.penalty.name} (${time(
        highestPenaltyWarning.createdAt,
        TimestampStyles.RelativeTime
      )})`,
    })
  }

  return messages
}
