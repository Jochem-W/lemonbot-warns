import { DismissWarnButton } from "../buttons/dismissWarnButton.mjs"
import { Prisma } from "../clients.mjs"
import {
  ImageOnlyError,
  InvalidPenaltyError,
  NoContentTypeError,
  reportError,
} from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { DefaultConfig } from "../models/config.mjs"
import { button } from "../utilities/button.mjs"
import {
  fetchChannel,
  fetchGuild,
  fetchMember,
} from "../utilities/discordUtilities.mjs"
import { makeEmbed } from "../utilities/embedUtilities.mjs"
import { getFormResponderUri } from "../utilities/googleForms.mjs"
import { uploadAttachment } from "../utilities/s3Utilities.mjs"
import type { Penalty, Reason, Warning } from "@prisma/client"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  DiscordAPIError,
  EmbedBuilder,
  escapeItalic,
  Guild,
  GuildMember,
  hyperlink,
  inlineCode,
  italic,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextChannel,
  User,
  userMention,
} from "discord.js"
import type { BanOptions, MessageActionRowComponentBuilder } from "discord.js"
import { DateTime, Duration } from "luxon"
import { customAlphabet } from "nanoid"
import nanoidDictionary from "nanoid-dictionary"
import MIMEType from "whatwg-mimetype"

const { nolookalikesSafe } = nanoidDictionary
const formUrl = await getFormResponderUri(DefaultConfig.banAppealForm.id)

export type ResponseOptions = {
  readonly reasons: string[]
  readonly penalty: Penalty
  readonly targetUser: User
  targetMember?: GuildMember
  readonly images: string[]
  readonly description: string
  readonly warnedBy: User
  notified?: "DM" | TextChannel | false
  penalised?: "applied" | "error" | "not_in_server" | "not_notified"
  readonly timestamp: DateTime
  readonly guild: Guild
  readonly notify: boolean
  readonly deleteMessages?: boolean
}

export class WarnCommand extends ChatInputCommand {
  private readonly penalties: Penalty[]

  public constructor(penalties: Penalty[], reasons: Reason[]) {
    super("warn", "Warn a user", PermissionFlagsBits.ModerateMembers)

    this.penalties = penalties

    const reasonChoices = reasons.map((reason) => ({
      name: reason.name,
      value: reason.name,
    }))

    this.builder
      .addUserOption((option) =>
        option.setName("user").setDescription("Target user").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription(
            "Concise warning reason for administration purposes, preferably only a couple of words"
          )
          .setRequired(true)
          .addChoices(...reasonChoices)
      )
      .addStringOption((option) =>
        option
          .setName("description")
          .setDescription(
            "Extended warning description that is added as a note and optionally sent to the user"
          )
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("penalty")
          .setDescription(
            "Penalty level for the user, automatically applied if notify is True"
          )
          .setRequired(true)
          .setChoices(
            ...penalties.map((penalty) => {
              return { name: penalty.name, value: penalty.name }
            })
          )
      )
      .addBooleanOption((option) =>
        option
          .setName("notify")
          .setDescription(
            "Whether to try to send a DM to the user or not (required for penalisation)"
          )
          .setRequired(true)
      )
      .addAttachmentOption((option) =>
        option
          .setName("image")
          .setDescription(
            "Optional image attachment that will also be sent to the user"
          )
      )
      .addAttachmentOption((option) =>
        option
          .setName("image2")
          .setDescription(
            "Optional image attachment that will also be sent to the user (using lots of images is discouraged)"
          )
      )
      .addAttachmentOption((option) =>
        option
          .setName("image3")
          .setDescription(
            "Optional image attachment that will also be sent to the user (using lots of images is discouraged)"
          )
      )
      .addAttachmentOption((option) =>
        option
          .setName("image4")
          .setDescription(
            "Optional image attachment that will also be sent to the user (using lots of images is discouraged)"
          )
      )
      .addAttachmentOption((option) =>
        option
          .setName("image5")
          .setDescription(
            "Optional image attachment that will also be sent to the user (using lots of images is discouraged)"
          )
      )
      .addStringOption((option) =>
        option
          .setName("reason2")
          .setDescription(
            "Concise warning reason for administration purposes, preferably only a couple of words"
          )
          .addChoices(...reasonChoices)
      )
      .addStringOption((option) =>
        option
          .setName("reason3")
          .setDescription(
            "Concise warning reason for administration purposes, preferably only a couple of words"
          )
          .addChoices(...reasonChoices)
      )
      .addBooleanOption((option) =>
        option
          .setName("delete-messages")
          .setDescription(
            "Delete the last 7 days of messages when banning the user (only valid for ban penalties)"
          )
      )
  }

  public static formatTitle(
    data: Pick<
      ResponseOptions,
      "penalty" | "notify" | "guild" | "warnedBy" | "reasons"
    >,
    options?: {
      includeReasons?: boolean
      includeGuild?: boolean
      lowercase?: boolean
      verbOnly?: boolean
    }
  ) {
    let title: string
    let preposition: string
    if (data.penalty.timeout) {
      title = "Timed out"
      preposition = "in"
    } else if (data.penalty.ban) {
      title = "Banned"
      preposition = "from"
    } else if (data.penalty.kick) {
      title = "Kicked"
      preposition = "from"
    } else {
      title = "Warned"
      preposition = "in"
    }

    if (!data.notify) {
      title += "*"
    }

    if (options?.lowercase) {
      title = title.toLowerCase()
    }

    if (options?.includeGuild) {
      title += ` ${preposition} ${data.guild.name}`
    }

    if (options?.verbOnly) {
      return title
    }

    title += ` by ${data.warnedBy.tag} `
    if (!options?.includeReasons) {
      return title
    }

    title += `for ${data.reasons.join(", ")}`
    return title
  }

  public static buildResponse(options: ResponseOptions, warning: Warning) {
    const reasonsText = options.reasons.join(", ")
    let administrationText = `• Reason: \`${reasonsText}\`\n• Penalty level: \`${options.penalty.name}\``
    if (options.notified === "DM") {
      administrationText += `\n• Notification: ${inlineCode("✅ (DM sent)")}`
    } else if (options.notified instanceof TextChannel) {
      administrationText += `\n• Notification: ${inlineCode(
        `✅ (mentioned in`
      )} ${channelMention(options.notified.id)} ${inlineCode(")")}`
    } else if (options.notified === false) {
      administrationText += `\n• Notification: ${inlineCode(
        "❌ (failed to DM)"
      )}`
    } else {
      administrationText += `\n• Notification: ${inlineCode(
        "❌ (notify was False)"
      )}`
    }

    switch (options.penalised) {
      case "applied":
        if (options.penalty.timeout) {
          const duration = Duration.fromObject(
            Object.fromEntries(
              Object.entries(
                Duration.fromMillis(options.penalty.timeout)
                  .shiftTo(
                    "weeks",
                    "days",
                    "hours",
                    "minutes",
                    "seconds",
                    "milliseconds"
                  )
                  .normalize()
                  .toObject()
              ).filter(([, value]) => value !== 0)
            )
          )
          administrationText += `\n• Penalised: ${inlineCode(
            `✅ (timed out for ${duration.toHuman()})`
          )}`
        } else if (options.penalty.ban) {
          administrationText += `\n• Penalised: ${inlineCode("✅ (banned)")}`
          administrationText += `\n• Deleted messages: ${inlineCode(
            options.deleteMessages
              ? "✅ (last 7 days)"
              : "❌ (delete-messages was False)"
          )}`
        } else {
          administrationText += `\n• Penalised: ${inlineCode(
            "❌ (penalty level has no penalty)"
          )}`
        }

        break
      case "error":
        administrationText += `\n• Penalised: ${inlineCode(
          "❌ (an error occurred)"
        )}`
        break
      case "not_in_server":
        administrationText += `\n• Penalised: ${inlineCode(
          "❌ (user not in server)"
        )}`
        break
      case "not_notified":
        administrationText += `\n• Penalised: ${inlineCode(
          "❌ (user wasn't notified)"
        )}`
        break
      default:
        administrationText += `\n• Penalised: ${inlineCode("❓ (unknown)")}`
        break
    }

    const avatar = (
      options.targetMember ?? options.targetUser
    ).displayAvatarURL()
    const tag = options.targetUser.tag

    const embed = makeEmbed(
      `${WarnCommand.formatTitle(options, { verbOnly: true })} ${tag} [${
        warning.id
      }]`,
      new URL(avatar)
    )
      .setFields([
        {
          name: "Description",
          value: options.description,
        },
        {
          name: "Administration",
          value: administrationText,
        },
        {
          name: "User ID",
          value: options.targetUser.id,
        },
      ])
      .setFooter({
        text: WarnCommand.formatTitle(options),
        iconURL: options.warnedBy.displayAvatarURL(),
      })
      .setTimestamp(options.timestamp.toMillis())

    if (options.images.length <= 1) {
      if (options.images[0]) {
        embed.setImage(options.images[0])
      }

      return { embeds: [embed] }
    }

    const embeds = [embed]
    for (const image of options.images) {
      embeds.push(new EmbedBuilder().setImage(image))
    }

    return { embeds: embeds }
  }

  public static buildDM(options: ResponseOptions) {
    const embeds = options.images.map((image) =>
      new EmbedBuilder().setImage(image).setColor(0xff0000)
    )
    let firstEmbed = embeds[0]
    if (!firstEmbed) {
      firstEmbed = new EmbedBuilder().setColor(0xff0000)
      embeds.push(firstEmbed)
    }

    firstEmbed
      .setAuthor({
        name: `You have been ${WarnCommand.formatTitle(options, {
          includeGuild: true,
          lowercase: true,
          verbOnly: true,
        })}`,
        iconURL: DefaultConfig.icons.warning.toString(),
      })
      .setFields({
        name: "Reason",
        value: options.description,
      })

    let footerEmbed = embeds.at(-1)
    if (!footerEmbed || options.penalty.ban) {
      footerEmbed = new EmbedBuilder().setColor(0xff0000)
      embeds.push(footerEmbed)
    }

    footerEmbed.setTimestamp(options.timestamp.toMillis())

    if (options.penalty.ban) {
      footerEmbed.setDescription(
        italic(
          escapeItalic(
            `If you'd like to appeal this decision, please fill in the form found ${hyperlink(
              "here",
              formUrl,
              `${options.guild.name} ban appeal form`
            )}.`
          )
        )
      )
    } else if (!options.penalty.kick) {
      footerEmbed.setFooter({
        text: "If you have any questions, please DM ModMail.",
      })
    }

    return { embeds: embeds }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const guild = await fetchGuild(interaction)
    const warnLogsChannel = await fetchChannel(
      DefaultConfig.guild.warnLogsChannel,
      ChannelType.GuildText
    )

    const penaltyName = interaction.options.getString("penalty", true)
    const penalty = this.penalties.find((p) => p.name === penaltyName)
    if (!penalty) {
      throw new InvalidPenaltyError(penaltyName)
    }

    const reasons: string[] = []
    for (const name of ["reason", "reason2", "reason3"].map((option) =>
      interaction.options.getString(option)
    )) {
      if (!name || reasons.includes(name)) {
        continue
      }

      reasons.push(name)
    }

    const images: string[] = []
    for (const image of ["image", "image2", "image3", "image4", "image5"].map(
      (name) => interaction.options.getAttachment(name)
    )) {
      if (!image) {
        continue
      }

      if (!image.contentType) {
        throw new NoContentTypeError(image)
      }

      const mimeType = new MIMEType(image.contentType)
      if (mimeType.type !== "image") {
        throw new ImageOnlyError(image)
      }

      images.push(await uploadAttachment(image))
    }

    const user = interaction.options.getUser("user", true)
    const description = interaction.options.getString("description", true)

    const member = await fetchMember(interaction, user)

    const options: ResponseOptions = {
      reasons: reasons,
      penalty: penalty,
      targetUser: user,
      images: images,
      description: description,
      warnedBy: interaction.user,
      timestamp: DateTime.now(),
      guild: guild,
      notify: interaction.options.getBoolean("notify", true),
      deleteMessages: interaction.options.getBoolean("delete-messages") ?? true,
    }

    if (member) {
      options.targetMember = member
    }

    if (options.notify) {
      options.notified = false
      try {
        await options.targetUser.send(WarnCommand.buildDM(options))
        options.notified = "DM"
      } catch (e) {
        if (
          !(e instanceof DiscordAPIError) ||
          e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser
        ) {
          throw e
        }
      }
    }

    if (
      options.notified === false &&
      options.targetMember &&
      !penalty.ban &&
      !penalty.kick
    ) {
      const nanoid = customAlphabet(nolookalikesSafe)
      const channelName = `${options.targetUser.username}-${
        options.targetUser.discriminator
      }-${nanoid(4)}`

      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: DefaultConfig.guild.warnCategory,
        reason:
          "Create a channel for privately warning a user that has DMs disabled",
      })

      await newChannel.permissionOverwrites.create(
        options.targetMember,
        {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false,
          ReadMessageHistory: true,
          UseApplicationCommands: true,
        },
        { reason: "Allow the user to-be-warned to view the channel" }
      )
      await newChannel.send({
        ...WarnCommand.buildDM(options),
        content: userMention(options.targetMember.id),
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
            [
              new ButtonBuilder()
                .setLabel("Dismiss")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(
                  button(DismissWarnButton, [
                    newChannel.id,
                    options.targetMember.id,
                  ])
                ),
            ]
          ),
        ],
      })

      options.notified = newChannel
    }

    const reason = WarnCommand.formatTitle(options, { includeReasons: true })
    if (options.notify) {
      try {
        if (penalty.ban) {
          if (options.targetMember) {
            const banOptions: BanOptions = { reason: reason }
            if (options.deleteMessages) {
              banOptions.deleteMessageSeconds = 604800
            }

            await options.targetMember.ban(banOptions)
            options.penalised = "applied"
          } else {
            options.penalised = "not_in_server"
          }
        } else if (penalty.timeout) {
          if (options.targetMember) {
            await options.targetMember.timeout(penalty.timeout, reason)
            options.penalised = "applied"
          } else {
            options.penalised = "not_in_server"
          }
        } else if (penalty.kick) {
          if (options.targetMember) {
            await options.targetMember.kick(reason)
            options.penalised = "applied"
          } else {
            options.penalised = "not_in_server"
          }
        } else {
          options.penalised = "applied"
        }
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(e)
        options.penalised = "error"
      }
    } else {
      options.penalised = "not_notified"
    }

    const prismaWarning = await Prisma.warning.create({
      data: {
        createdAt: interaction.createdAt,
        createdBy: options.warnedBy.id,
        description: options.description,
        images: options.images,
        silent: !options.notify,
        penalty: {
          connect: {
            name: options.penalty.name,
          },
        },
        reasons: {
          connect: options.reasons.map((reason) => ({ name: reason })),
        },
        user: {
          connectOrCreate: {
            where: {
              id: options.targetUser.id,
            },
            create: {
              id: options.targetUser.id,
              priority: false,
            },
          },
        },
      },
    })

    await Prisma.user.update({
      where: {
        id: options.targetUser.id,
      },
      data: {
        penaltyOverride: {
          disconnect: true,
        },
      },
    })

    const response = WarnCommand.buildResponse(options, prismaWarning)
    try {
      await interaction.editReply(response)
    } catch (e) {
      if (
        !(e instanceof DiscordAPIError) ||
        e.code !== RESTJSONErrorCodes.UnknownMessage
      ) {
        throw e
      }

      await warnLogsChannel.send(response)
      return
    }

    if (interaction.channelId !== warnLogsChannel.id) {
      await warnLogsChannel.send(response)
    }
  }
}
