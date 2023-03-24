import { DismissWarnButton } from "../buttons/dismissWarnButton.mjs"
import { Discord, Prisma } from "../clients.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { warnMessage } from "../messages/warnMessage.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { button } from "../utilities/button.mjs"
import { fetchChannel, tryFetchMember } from "../utilities/discordUtilities.mjs"
import { uploadAttachment } from "../utilities/s3Utilities.mjs"
import type { Penalty, Reason, Warning } from "@prisma/client"
import type {
  Attachment,
  ChatInputCommandInteraction,
  MessageActionRowComponentBuilder,
} from "discord.js"
import {
  ChannelType,
  DiscordAPIError,
  GuildMember,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  userMention,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js"
import { customAlphabet } from "nanoid"
import nanoidDictionary from "nanoid-dictionary"

const { nolookalikesSafe } = nanoidDictionary
const nanoid = customAlphabet(nolookalikesSafe)
const guild = await Discord.guilds.fetch(DefaultConfig.guild.id)
const warnLogsChannel = await fetchChannel(
  DefaultConfig.guild.warnLogsChannel,
  ChannelType.GuildText
)

export class WarnCommand extends ChatInputCommand {
  public constructor(reasons: Reason[], penalties: Penalty[]) {
    super("warn", "Warn a user", PermissionFlagsBits.ModerateMembers)
    this.builder
      .addUserOption((builder) =>
        builder
          .setName("user")
          .setDescription("The target user")
          .setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("reason")
          .setDescription("Concise warning reason for administration purposes")
          .setChoices(...reasons.map((r) => ({ name: r.name, value: r.name })))
          .setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("description")
          .setDescription("Extended description that will be sent to the user")
          .setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("penalty")
          .setDescription("The penalty to give to the user")
          .setChoices(
            ...penalties.map((p) => ({ name: p.name, value: p.name }))
          )
          .setRequired(true)
      )
      .addBooleanOption((builder) =>
        builder
          .setName("notify")
          .setDescription("Whether to notify the user of the warning")
          .setRequired(true)
      )
      .addStringOption((builder) =>
        builder
          .setName("reason2")
          .setDescription("Concise warning reason for administration purposes")
          .setChoices(...reasons.map((r) => ({ name: r.name, value: r.name })))
      )
      .addStringOption((builder) =>
        builder
          .setName("reason3")
          .setDescription("Concise warning reason for administration purposes")
          .setChoices(...reasons.map((r) => ({ name: r.name, value: r.name })))
      )
      .addAttachmentOption((builder) =>
        builder
          .setName("image")
          .setDescription("An image to add to the warning and send to the user")
      )
      .addAttachmentOption((builder) =>
        builder
          .setName("image2")
          .setDescription("An image to add to the warning and send to the user")
      )
      .addAttachmentOption((builder) =>
        builder
          .setName("image3")
          .setDescription("An image to add to the warning and send to the user")
      )
      .addAttachmentOption((builder) =>
        builder
          .setName("image4")
          .setDescription("An image to add to the warning and send to the user")
      )
  }

  private async notify(
    target: GuildMember | User,
    warning: Warning & { penalty: Penalty }
  ) {
    if (warning.silent) {
      return "SILENT"
    }

    if (target instanceof User) {
      return "NOT_IN_SERVER"
    }

    const message = warnMessage(warning)

    try {
      await target.send(message)
      return "DM"
    } catch (e) {
      if (
        !(e instanceof DiscordAPIError) ||
        e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser
      ) {
        await Prisma.warning.delete({ where: { id: warning.id } })
        throw e
      }
    }

    if (warning.penalty.ban) {
      return "DMS_DISABLED"
    }

    const newChannel = await guild.channels.create({
      name: `${target.user.username}-${target.user.discriminator}-${nanoid(4)}`,
      type: ChannelType.GuildText,
      parent: DefaultConfig.guild.warnCategory,
      reason: "Create a channel for warning a user that has DMs disabled",
    })

    await newChannel.permissionOverwrites.create(
      target.id,
      {
        ViewChannel: true,
        SendMessages: false,
        AddReactions: false,
        ReadMessageHistory: true,
        UseApplicationCommands: true,
      },
      { reason: "Allow the member to-be-warned to view the channel" }
    )
    await newChannel.send({
      ...message,
      content: userMention(target.id),
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setLabel("Dismiss")
            .setStyle(ButtonStyle.Danger)
            .setCustomId(button(DismissWarnButton, [warning.id.toString()]))
        ),
      ],
    })

    return "CHANNEL"
  }

  private async penalise(
    target: GuildMember | User,
    warning: Warning & { penalty: Penalty; reasons: Reason[] }
  ) {
    const by = await Discord.users.fetch(warning.createdBy)
    const reason = `By ${by.tag} for ${warning.reasons.join(", ")}`

    if (warning.penalty.ban) {
      await guild.bans.create(target.id, {
        deleteMessageSeconds: 604800,
        reason,
      })
      return "APPLIED"
    }

    if (target instanceof User) {
      return "NOT_IN_SERVER"
    }

    if (warning.penalty.kick) {
      await target.kick(reason)
      return "APPLIED"
    }

    if (warning.penalty.timeout) {
      await target.timeout(warning.penalty.timeout, reason)
      return "APPLIED"
    }

    return "NO_PENALTY"
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user", true)
    const targetMember = await tryFetchMember(targetUser.id)
    const reasons = [
      interaction.options.getString("reason", true),
      interaction.options.getString("reason2"),
      interaction.options.getString("reason3"),
    ].filter((r) => r !== null) as string[]
    const attachments = [
      interaction.options.getAttachment("image"),
      interaction.options.getAttachment("image2"),
      interaction.options.getAttachment("image3"),
      interaction.options.getAttachment("image4"),
    ].filter((r) => r !== null) as Attachment[]

    let warning = await Prisma.warning.create({
      data: {
        user: {
          connectOrCreate: {
            where: {
              id: targetUser.id,
            },
            create: {
              id: targetUser.id,
              priority: true,
            },
          },
        },
        createdAt: interaction.createdAt,
        createdBy: interaction.user.id,
        description: interaction.options.getString("description", true),
        silent: !interaction.options.getBoolean("notify", true),
        penalty: {
          connect: {
            name: interaction.options.getString("penalty", true),
          },
        },
        reasons: {
          connect: reasons.map((r) => ({ name: r })),
        },
        images: await Promise.all(attachments.map(uploadAttachment)),
      },
      include: { penalty: true, reasons: true },
    })

    console.log("Created warning with ID", warning.id)

    const notified = await this.notify(targetMember ?? targetUser, warning)
    const penalised = await this.penalise(targetMember ?? targetUser, warning)

    warning = await Prisma.warning.update({
      where: { id: warning.id },
      data: { notified: notified, penalised },
      include: { penalty: true, reasons: true },
    })

    const logMessage = await warnLogMessage(warning)
    await interaction.editReply(logMessage)
    if (interaction.channelId !== warnLogsChannel.id || interaction.ephemeral) {
      await warnLogsChannel.send(logMessage)
    }
  }
}
