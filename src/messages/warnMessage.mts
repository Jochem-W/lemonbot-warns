import { Discord } from "../clients.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { warningUrl } from "../utilities/discordUtilities.mjs"
import { getFormResponderUri } from "../utilities/googleForms.mjs"
import type { Image, Penalty, Warning, WarningGuild } from "@prisma/client"
import { EmbedBuilder, escapeItalic, hyperlink, italic } from "discord.js"

const formUrl = await getFormResponderUri(DefaultConfig.banAppealForm.id)
const mailUser = await Discord.users.fetch(DefaultConfig.mailUserId)

export async function warnMessage(
  warning: Warning & { penalty: Penalty; images: Image[]; guild: WarningGuild }
) {
  let verb
  if (warning.penalty.ban) {
    verb = "banned from"
  } else if (warning.penalty.kick) {
    verb = "kicked from"
  } else if (warning.penalty.timeout) {
    verb = "timed out in"
  } else {
    verb = "warned in"
  }

  const embeds = warning.images
    .filter((i) => !i.extra)
    .map((i) =>
      new EmbedBuilder()
        .setImage(i.url)
        .setURL(warningUrl(warning).toString())
        .setColor(0xff0000)
    )

  let mainEmbed: EmbedBuilder | undefined = embeds[0]
  if (!mainEmbed) {
    mainEmbed = new EmbedBuilder().setColor(0xff0000)
    embeds.push(mainEmbed)
  }

  const guild = await Discord.guilds.fetch(warning.guild.id)

  mainEmbed
    .setAuthor({
      name: `You have been ${verb} ${guild.name}`,
      iconURL: DefaultConfig.icons.warning.toString(),
    })
    .setTimestamp(warning.createdAt)
    .setColor(0xff0000)

  if (warning.description) {
    mainEmbed.setFields({ name: "Reason", value: warning.description })
  }

  if (!warning.penalty.ban) {
    mainEmbed.setFooter({
      text: `If you have any questions, please DM ${mailUser.username}`,
    })
  } else {
    embeds.push(
      new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(
          italic(
            escapeItalic(
              `If you'd like to appeal this decision, please fill in the form found ${hyperlink(
                "here",
                formUrl
              )}.`
            )
          )
        )
    )
  }

  return { embeds }
}
