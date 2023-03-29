import { Discord, Prisma } from "../clients.mjs"
import { chunks } from "../utilities/arrayUtilities.mjs"
import { formatName } from "../utilities/embedUtilities.mjs"
import { comparePenalty } from "../utilities/penaltyUtilities.mjs"
import { compareReason } from "../utilities/reasonUtilities.mjs"
import type { EmbedFooterOptions, GuildMember } from "discord.js"
import { EmbedBuilder, time, TimestampStyles, User } from "discord.js"

export async function warningsMessage(userOrMember: User | GuildMember) {
  const prismaUser = await Prisma.user.findFirst({
    where: { id: userOrMember.id },
    include: {
      warnings: {
        include: {
          penalty: true,
          reasons: true,
          images: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  const summaryEmbed = new EmbedBuilder().setAuthor({
    name: `Warnings for ${formatName(userOrMember)}`,
    iconURL: userOrMember.displayAvatarURL(),
  })

  if (!prismaUser || prismaUser.warnings.length === 0) {
    summaryEmbed.setTitle(
      `This ${
        userOrMember instanceof User ? "user" : "member"
      } has no logged warnings`
    )
    return [{ embeds: [summaryEmbed] }]
  }

  const lastWarning = prismaUser.warnings.at(-1)
  if (lastWarning) {
    summaryEmbed.setFields({
      name: "Most recent penalty",
      value: `${lastWarning.penalty.name} (${time(
        lastWarning.createdAt,
        TimestampStyles.RelativeTime
      )})`,
    })
  }

  let highestPenaltyWarning = null
  const embeds = [summaryEmbed]
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

    const createdBy = await Discord.users.fetch(warning.createdBy)

    const warningInfoEmbed = new EmbedBuilder()
      .setTitle(
        `${verb} by ${createdBy.tag} for ${warning.reasons
          .sort(compareReason)
          .map((r) => r.name)
          .join(", ")} ${time(warning.createdAt, TimestampStyles.RelativeTime)}`
      )
      .setDescription(warning.description)
      .setFooter({ text: warning.id.toString() } as EmbedFooterOptions)
      .setTimestamp(warning.createdAt)

    embeds.push(warningInfoEmbed)
    embeds.push(
      ...warning.images.map((i) =>
        new EmbedBuilder()
          .setImage(i.url)
          .setURL(`https://jochem.cc/${warning.id}`)
      )
    )
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

  return [...chunks(embeds, 10)].map((e) => ({ embeds: e }))
}
