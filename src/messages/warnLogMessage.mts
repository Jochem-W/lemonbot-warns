import { EditDescriptionButton } from "../buttons/editDescriptionButton.mjs"
import { Discord } from "../clients.mjs"
import { button } from "../utilities/button.mjs"
import { userDisplayName, warningUrl } from "../utilities/discordUtilities.mjs"
import type {
  Image,
  Penalty,
  Warning,
  WarningGuild,
  WarningLogMessage,
} from "@prisma/client"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  inlineCode,
} from "discord.js"

export async function warnLogMessage(
  warning: Warning & {
    penalty: Penalty
    images: Image[]
    guild: WarningGuild
    messages: WarningLogMessage[]
  }
) {
  const guild = await Discord.guilds.fetch(warning.guildId)

  const user = await Discord.users.fetch(warning.userId)

  const createdBy = await Discord.users.fetch(warning.createdBy)

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
    case "REGULAR_BAN":
      notificationText = "❌ (regular ban)"
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

  let mainEmbed: EmbedBuilder | undefined = embeds[0]
  if (!mainEmbed) {
    mainEmbed = new EmbedBuilder()
    embeds.push(mainEmbed)
  }

  mainEmbed
    .setAuthor({
      name: `${verb} ${userDisplayName(user)} in ${guild.name} [${warning.id}]`,
      iconURL: user.displayAvatarURL(),
    })
    .setFields(
      { name: "Description", value: warning.description ?? "-" },
      { name: "Penalty", value: warning.penalty.name },
      { name: "Notification", value: notificationText },
      { name: "Penalised", value: penaltyText },
      { name: "User ID", value: user.id }
    )
    .setFooter({
      text: userDisplayName(createdBy),
      iconURL: createdBy.displayAvatarURL(),
    })
    .setTimestamp(warning.createdAt)

  const extraImages = warning.images
    .filter((i) => i.extra)
    .map((i) =>
      new EmbedBuilder()
        .setImage(i.url)
        .setURL(warningUrl(warning, "extra").toString())
    )

  extraImages[0]?.setAuthor({ name: "Extra images" }) // Looks better than title

  embeds.push(...extraImages)

  const components = []
  if (!warning.description) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Edit description")
          .setCustomId(button(EditDescriptionButton, [warning.id.toString()]))
      )
    )
  }

  return {
    embeds,
    components,
  }
}
