import { Prisma } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { component } from "../models/component.mjs"
import { modal, modalInput } from "../models/modal.mjs"
import {
  fetchChannel,
  isInPrivateChannel,
  warningUrl,
} from "../utilities/discordUtilities.mjs"
import type {
  Image,
  Notified,
  Penalty,
  Warning,
  WarningGuild,
  WarningLogMessage,
} from "@prisma/client"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  ComponentType,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  TextInputBuilder,
  TextInputStyle,
  TimestampStyles,
  time,
  userMention,
} from "discord.js"
import { DateTime, Duration } from "luxon"

const editDescriptionButton = component({
  type: ComponentType.Button,
  name: "edit-warn",
  async handle(interaction, warningId) {
    const warning = await Prisma.warning.findFirstOrThrow({
      where: {
        id: parseInt(warningId),
      },
    })

    const input = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("New description")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
    if (warning.description) {
      input.setValue(warning.description)
    }

    await interaction.showModal(
      editDescriptionModal(
        { description: warning.description ?? "" },
        warningId,
      ),
    )
  },
})

const editDescriptionModal = modal({
  id: "edit-warn",
  title: "Edit warning description",
  components: [
    modalInput(
      "description",
      false,
      new TextInputBuilder()
        .setLabel("Description")
        .setStyle(TextInputStyle.Paragraph),
    ),
  ],
  async handle(interaction, { description }, warningId) {
    const oldWarning = await Prisma.warning.findFirstOrThrow({
      where: { id: parseInt(warningId) },
    })
    const warning = await Prisma.warning.update({
      where: {
        id: oldWarning.id,
      },
      data: {
        description: description ?? null,
      },
      include: {
        penalty: true,
        images: true,
        guild: true,
        messages: true,
      },
    })

    const reply = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Warning edited")
          .setFields(
            { name: "Old description", value: oldWarning.description ?? "-" },
            { name: "New description", value: warning.description ?? "-" },
          ),
      ],
      ephemeral: !(await isInPrivateChannel(interaction)),
    })

    setTimeout(
      () =>
        void reply
          .delete()
          .catch((e) =>
            e instanceof Error
              ? void logError(interaction.client, e)
              : console.error(e),
          ),
      2500,
    )

    const logMessage = await warnLogMessage(interaction.client, warning)
    for (const message of warning.messages) {
      const channel = await fetchChannel(
        interaction.client,
        message.channelId,
        ChannelType.GuildText,
      )
      await channel.messages.edit(message.id, logMessage)
    }
  },
})

export async function warnLogMessage(
  client: Client<true>,
  warning: Warning & {
    penalty: Penalty
    images: Image[]
    guild: WarningGuild
    messages: WarningLogMessage[]
  },
) {
  const embeds = warning.images.map((image) =>
    new EmbedBuilder()
      .setImage(image.url)
      .setURL(warningUrl(warning).toString()),
  )
  const components = []

  let firstEmbed = embeds[0]
  if (!firstEmbed) {
    firstEmbed = new EmbedBuilder()
    embeds.push(firstEmbed)
  }
  const createdBy = await client.users.fetch(warning.createdBy)
  const target = await client.users.fetch(warning.userId)
  const guild = await client.guilds.fetch(warning.guildId)

  firstEmbed
    .setAuthor({
      name: `${createdBy.displayName} ${actionVerb(warning)} ${
        target.displayName
      } in ${guild.name}`,
      iconURL: createdBy.displayAvatarURL(),
    })
    .setThumbnail(target.displayAvatarURL())
    .setFooter({
      text: `${warning.id}${notifiedText(warning)}`,
    })
    .setTimestamp(warning.createdAt)

  if (warning.description) {
    firstEmbed.setFields({ name: "⚠️ Reason", value: warning.description })
  } else {
    components.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Edit description")
          .setCustomId(editDescriptionButton(warning.id.toString(10))),
      ),
    )
  }

  if (warning.penalty.timeout) {
    firstEmbed.addFields({
      name: "🕛 Timeout duration",
      value: shiftDuration(
        Duration.fromMillis(warning.penalty.timeout),
      ).toHuman(),
    })
  } else if (warning.penalty.ban && warning.penalty.deleteMessages) {
    const date = DateTime.fromJSDate(warning.createdAt)
      .minus({ days: 7 })
      .toJSDate()
    firstEmbed.addFields({
      name: "🗑️ Messages deleted",
      value: `Last 7 days (since ${time(
        date,
        TimestampStyles.ShortTime,
      )} ${time(date, TimestampStyles.ShortDate)})`,
    })
  }

  firstEmbed.addFields(
    { name: "👤 User", value: userMention(target.id), inline: true },
    { name: "#️⃣ User ID", value: target.id, inline: true },
  )

  const errors = []
  switch (warning.notified) {
    case "DMS_DISABLED":
      errors.push("- Sending a DM failed, because the member has DMs disabled.")
      break
    case "NOT_IN_SERVER":
      errors.push(
        "- Sending a DM failed, because the user is not in the server.",
      )
      break
  }

  switch (warning.penalised) {
    case "NOT_IN_SERVER":
      errors.push(
        "- Penalising the user failed, because they're not in the server.",
      )
      break
  }

  if (errors.length > 0) {
    firstEmbed.addFields({ name: "🦐 Errors", value: errors.join("\n") })
  }

  return { embeds }
}

function notifiedText(warning: { notified: Notified | null }) {
  switch (warning.notified) {
    case "DM":
      return ", notified via DM"
    case "CHANNEL":
      return ", notified via channel"
    default:
      return ""
  }
}

function actionVerb(warning: { penalty: Penalty }) {
  if (warning.penalty.ban) {
    return "banned"
  } else if (warning.penalty.kick) {
    return "kicked"
  } else if (warning.penalty.timeout) {
    return "timed out"
  } else {
    return "warned"
  }
}

function shiftDuration(duration: Duration) {
  return Duration.fromObject(
    Object.fromEntries(
      Object.entries(duration.shiftToAll().toObject()).filter(
        ([, value]) => value !== 0,
      ),
    ),
  )
}
