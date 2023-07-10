import { Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { originalUserOnlyMessage } from "../messages/originalUserOnlyMessage.mjs"
import { warnLogMessage } from "../messages/warnLogMessage.mjs"
import { warnMessage } from "../messages/warnMessage.mjs"
import { component } from "../models/component.mjs"
import { slashCommand, slashOption } from "../models/slashCommand.mjs"
import {
  fetchChannel,
  tryFetchMember,
  uniqueName,
  userDisplayName,
} from "../utilities/discordUtilities.mjs"
import { interactionGuild } from "../utilities/interactionUtilities.mjs"
import { uploadAttachment } from "../utilities/s3Utilities.mjs"
import type {
  Image,
  Penalty,
  Warning,
  WarningGuild,
  WarningLogMessage,
} from "@prisma/client"
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
  Guild,
  type Attachment,
  type BanOptions,
  type MessageActionRowComponentBuilder,
  SlashCommandUserOption,
  SlashCommandStringOption,
  SlashCommandBooleanOption,
  SlashCommandAttachmentOption,
  ComponentType,
} from "discord.js"
import { customAlphabet } from "nanoid"
import nanoidDictionary from "nanoid-dictionary"

const { nolookalikesSafe } = nanoidDictionary
const nanoid = customAlphabet(nolookalikesSafe)

const dismissWarnButton = component({
  type: ComponentType.Button,
  name: "dismiss-warn",
  async handle(interaction, channelId, userId) {
    if (interaction.user.id !== userId) {
      await interaction.reply({
        ...originalUserOnlyMessage(interaction.componentType),
        ephemeral: true,
      })
      return
    }

    const channel = await fetchChannel(
      interaction.client,
      channelId,
      ChannelType.GuildText
    )
    await channel.delete()
    await interaction.deferUpdate()
  },
})

export const WarnCommand = slashCommand({
  name: "warn",
  description: "Warn a user",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  dmPermission: false,
  options: [
    slashOption(
      true,
      new SlashCommandUserOption()
        .setName("user")
        .setDescription("The target user")
    ),
    slashOption(
      true,
      new SlashCommandStringOption()
        .setName("description")
        .setDescription("Description that will be sent to the user")
    ),
    slashOption(
      true,
      new SlashCommandStringOption()
        .setName("penalty")
        .setDescription("The penalty to give to the user")
        .setChoices(
          ...(await Prisma.penalty.findMany({ where: { hidden: false } })).map(
            (p) => ({
              name: p.name,
              value: p.name,
            })
          )
        )
    ),
    slashOption(
      true,
      new SlashCommandBooleanOption()
        .setName("notify")
        .setDescription("Whether to notify the user of the warning")
    ),
    slashOption(
      false,
      new SlashCommandAttachmentOption()
        .setName("image")
        .setDescription("An image to add to the warning and send to the user")
    ),
    slashOption(
      false,
      new SlashCommandAttachmentOption()
        .setName("image2")
        .setDescription("An image to add to the warning and send to the user")
    ),
    slashOption(
      false,
      new SlashCommandAttachmentOption()
        .setName("image3")
        .setDescription("An image to add to the warning and send to the user")
    ),
    slashOption(
      false,
      new SlashCommandAttachmentOption()
        .setName("image4")
        .setDescription("An image to add to the warning and send to the user")
    ),
  ],
  async handle(
    interaction,
    targetUser,
    description,
    penalty,
    notSilent,
    image,
    image2,
    image3,
    image4
  ) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const guild = await interactionGuild(interaction, true)
    const prismaGuild = await Prisma.warningGuild.findFirstOrThrow({
      where: { id: guild.id },
    })

    await interaction.deferReply({
      ephemeral: interaction.channelId !== prismaGuild.warnLogsChannel,
    })

    const targetMember = await tryFetchMember(guild, targetUser)
    const attachments = [image, image2, image3, image4].filter(
      (r) => r !== null
    ) as Attachment[]

    const attachmentUrls = await Promise.all(attachments.map(uploadAttachment))

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
        description,
        silent: !notSilent,
        penalty: {
          connect: {
            name: penalty,
          },
        },
        images: {
          createMany: {
            data: attachmentUrls.map((url) => ({ url, extra: false })),
          },
        },
        guild: {
          connect: {
            id: prismaGuild.id,
          },
        },
      },
      include: {
        penalty: true,
        images: true,
        guild: true,
        messages: true,
      },
    })

    console.log("Created warning with ID", warning.id)

    const notified = await notify(targetMember ?? targetUser, warning, guild)
    const penalised = await penalise(targetMember ?? targetUser, warning, guild)

    warning = await Prisma.warning.update({
      where: { id: warning.id },
      data: { notified: notified, penalised },
      include: {
        penalty: true,
        images: true,
        guild: true,
        messages: true,
      },
    })

    const logMessage = await warnLogMessage(interaction.client, warning)

    let channel = await fetchChannel(
      interaction.client,
      prismaGuild.warnLogsChannel,
      ChannelType.GuildText
    )

    let message = await interaction.editReply(logMessage)
    if (interaction.channelId !== channel.id || interaction.ephemeral) {
      message = await channel.send(logMessage)
    }

    await Prisma.warningLogMessage.create({
      data: {
        id: message.id,
        channelId: channel.id,
        main: true,
        warning: { connect: { id: warning.id } },
      },
    })

    const otherGuilds = await Prisma.warningGuild.findMany({
      where: { id: { not: guild.id } },
    })
    for (const otherGuild of otherGuilds) {
      if (
        !(await tryFetchMember(
          { client: interaction.client, id: otherGuild.id },
          warning.userId
        ))
      ) {
        continue
      }

      channel = await fetchChannel(
        interaction.client,
        otherGuild.warnLogsChannel,
        ChannelType.GuildText
      )
      message = await channel.send(logMessage)
      await Prisma.warningLogMessage.create({
        data: {
          id: message.id,
          channelId: channel.id,
          main: false,
          warning: { connect: { id: warning.id } },
        },
      })
    }
  },
})

async function notify(
  target: GuildMember | User,
  warning: Warning & {
    penalty: Penalty
    images: Image[]
    guild: WarningGuild
    messages: WarningLogMessage[]
  },
  guild: Guild
) {
  if (warning.silent) {
    return "SILENT"
  }

  if (target instanceof User) {
    return "NOT_IN_SERVER"
  }

  const message = await warnMessage(target.client, warning)

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
    name: `${uniqueName(target.user).replace("#", "-")}-${nanoid(4)}`,
    type: ChannelType.GuildText,
    parent: warning.guild.warnCategory,
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
          .setCustomId(dismissWarnButton(newChannel.id, warning.userId))
      ),
    ],
  })

  return "CHANNEL"
}

async function penalise(
  target: GuildMember | User,
  warning: Warning & { penalty: Penalty },
  guild: Guild
) {
  const by = await guild.client.users.fetch(warning.createdBy)
  const reason = `By ${userDisplayName(by)}`

  if (warning.penalty.ban) {
    const banOptions: BanOptions = { reason }
    if (warning.penalty.deleteMessages) {
      banOptions.deleteMessageSeconds = 604800
    }

    await guild.bans.create(target.id, banOptions)
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
