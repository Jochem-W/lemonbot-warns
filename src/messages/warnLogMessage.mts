import { Discord } from "../clients.mjs"
import { tryFetchMember, warningUrl } from "../utilities/discordUtilities.mjs"
import { formatName } from "../utilities/embedUtilities.mjs"
import { compareReason } from "../utilities/reasonUtilities.mjs"
import type { Image, Penalty, Reason, Warning } from "@prisma/client"
import { EmbedBuilder, inlineCode } from "discord.js"

export async function warnLogMessage(
  warning: Warning & { penalty: Penalty; reasons: Reason[]; images: Image[] }
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
      notificationText = `❌ (notify was ${inlineCode("False")})`
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
    case null:
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
    case "NO_PENALTY":
      penaltyText = "❌ (no penalty)"
      break
    case null:
      penaltyText = "❓"
      break
  }

  const embeds = warning.images
    .filter((i) => !i.extra)
    .map((i) =>
      new EmbedBuilder().setImage(i.url).setURL(warningUrl(warning).toString())
    )

  const extraImages = warning.images
    .filter((i) => i.extra)
    .map((i) =>
      new EmbedBuilder()
        .setImage(i.url)
        .setURL(warningUrl(warning, "extra").toString())
    )

  extraImages[0]?.setAuthor({ name: "Extra images" })

  embeds.push(...extraImages)

  let mainEmbed: EmbedBuilder | undefined = embeds[0]
  if (!mainEmbed) {
    mainEmbed = new EmbedBuilder()
    embeds.push(mainEmbed)
  }

  mainEmbed
    .setAuthor({
      name: `${verb} ${formatName(member ?? user)} [${warning.id}]`,
      iconURL: (member ?? user).displayAvatarURL(),
    })
    .setFields(
      { name: "Description", value: warning.description ?? "-" },
      {
        name: warning.reasons.length === 1 ? "Reason" : "Reasons",
        value: warning.reasons
          .sort(compareReason)
          .map((r) => r.name)
          .join(", "),
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
    embeds,
  }
}
