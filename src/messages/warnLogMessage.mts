import { Prisma } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { component } from "../models/component.mjs"
import { modal, modalInput } from "../models/modal.mjs"
import {
  fetchChannel,
  isInPrivateChannel,
  userDisplayName,
  warningUrl,
} from "../utilities/discordUtilities.mjs"
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
  ChannelType,
  Client,
  ComponentType,
  EmbedBuilder,
  TextInputBuilder,
  TextInputStyle,
  inlineCode,
} from "discord.js"

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
  const guild = await client.guilds.fetch(warning.guildId)

  const user = await client.users.fetch(warning.userId)

  const createdBy = await client.users.fetch(warning.createdBy)

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
      notificationText = "❌ (the user has DMs disabled)"
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
      new EmbedBuilder().setImage(i.url).setURL(warningUrl(warning).toString()),
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
      { name: "User ID", value: user.id },
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
        .setURL(warningUrl(warning, "extra").toString()),
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
          .setCustomId(editDescriptionButton(warning.id.toString(10))),
      ),
    )
  }

  return {
    embeds,
    components,
  }
}
