import { Discord } from "../clients.mjs"
import { tryFetchMember } from "../utilities/discordUtilities.mjs"
import type { Penalty, Reason, Warning } from "@prisma/client"
import { EmbedBuilder, inlineCode } from "discord.js"

export async function WarnLogMessage(
  warning: Warning & { penalty: Penalty; reasons: Reason[] }
) {
  const member = await tryFetchMember(warning.userId)
  const user = member?.user ?? (await Discord.users.fetch(warning.userId))

  const createdByMember = await tryFetchMember(warning.createdBy)
  const createdByUser =
    createdByMember?.user ?? (await Discord.users.fetch(warning.createdBy))

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

  if (warning.silent) {
    verb += "*"
  }

  let notificationText
  switch (warning.notified) {
    case "SILENT":
      notificationText = `❌ (silent was ${inlineCode("True")})`
      break
    case "NOT_IN_SERVER":
      notificationText = "❌ (the user isn't in the server)"
      break
    case "DM":
      notificationText = "✅ (via DMs)"
      break
    case "DMS_DISABLED":
      notificationText =
        "❌ (the user has DMs disabled and the penalty disallows notifying using a channel)"
      break
    case "CHANNEL":
      notificationText = "✅ (via channel)"
      break
    default:
      notificationText = "❓"
      break
  }

  let penaltyText
  switch (warning.penalised) {
    case "NOT_IN_SERVER":
      penaltyText = "❌ (the user isn't in the server)"
      break
    case "APPLIED":
      penaltyText = "✅ (applied)"
      break
    default:
      penaltyText = "❓"
      break
  }

  const mainEmbed = new EmbedBuilder()
    .setAuthor({
      name: `${verb} ${user.tag} [${warning.id}]`,
      iconURL: (member ?? user).displayAvatarURL(),
    })
    .setFields(
      { name: "Description", value: warning.description ?? "-" },
      {
        name: warning.reasons.length === 1 ? "Reason" : "Reasons",
        value: warning.reasons.map((r) => r.name).join(","),
      },
      { name: "Penalty", value: warning.penalty.name },
      { name: "Notification", value: notificationText },
      { name: "Penalised", value: penaltyText },
      { name: "User ID", value: user.id }
    )
    .setFooter({
      text: `${verb} by ${createdByUser.tag}`,
      iconURL: (createdByMember ?? createdByUser).displayAvatarURL(),
    })
    .setTimestamp(warning.createdAt)

  return {
    embeds: [
      mainEmbed,
      warning.images.map((i) => new EmbedBuilder().setImage(i)),
    ],
  }
}
