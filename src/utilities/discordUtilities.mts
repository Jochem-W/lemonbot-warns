import { Discord, Prisma } from "../clients.mjs"
import {
  ChannelNotFoundError,
  GuildOnlyError,
  InvalidChannelTypeError,
  OwnerOnlyError,
} from "../errors.mjs"
import type { Warning, WarningGuild, WarningLogMessage } from "@prisma/client"
import {
  User,
  type Channel,
  type FetchChannelOptions,
  type GuildMember,
  type PublicThreadChannel,
  type Snowflake,
} from "discord.js"
import {
  ChannelType,
  DiscordAPIError,
  RESTJSONErrorCodes,
  Guild,
  Team,
} from "discord.js"
import type {
  FetchMemberOptions,
  Interaction,
  UserResolvable,
} from "discord.js"
import { DateTime } from "luxon"

export function uniqueName(user: User) {
  if (user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`
  }

  return user.username
}

export function displayName(userOrMember: User | GuildMember) {
  if (userOrMember instanceof User) {
    return userDisplayName(userOrMember)
  }

  if (userOrMember.nickname) {
    return userOrMember.nickname
  }

  return userDisplayName(userOrMember.user)
}

function userDisplayName(user: User) {
  if (user.globalName) {
    return user.globalName
  }

  return uniqueName(user)
}

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}

export async function tryFetchMember(
  guild: Snowflake | Guild,
  options: FetchMemberOptions | UserResolvable
) {
  if (!(guild instanceof Guild)) {
    guild = await Discord.guilds.fetch(guild)
  }

  try {
    return await guild.members.fetch(options)
  } catch (e) {
    if (
      e instanceof DiscordAPIError &&
      e.code === RESTJSONErrorCodes.UnknownMember
    ) {
      return null
    }

    throw e
  }
}

export async function fetchChannel<T extends ChannelType>(
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
) {
  const channel = await Discord.channels.fetch(id, {
    allowUnknownGuild: true,
    ...options,
  })
  if (!channel) {
    throw new ChannelNotFoundError(id)
  }

  if (channel.type !== type) {
    throw new InvalidChannelTypeError(channel, type)
  }

  return channel as T extends
    | ChannelType.PublicThread
    | ChannelType.AnnouncementThread
    ? PublicThreadChannel
    : Extract<Channel, { type: T }>
}

export async function fetchInteractionGuild(interaction: Interaction) {
  if (!interaction.inGuild()) {
    throw new GuildOnlyError()
  }

  return interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
}

export async function ensureOwner(interaction: Interaction) {
  let application = interaction.client.application
  if (!application.owner) {
    application = await application.fetch()
  }

  if (!application.owner) {
    throw new OwnerOnlyError()
  }

  if (application.owner instanceof Team) {
    if (!application.owner.members.has(interaction.user.id)) {
      throw new OwnerOnlyError()
    }

    return
  }

  if (application.owner.id !== interaction.user.id) {
    throw new OwnerOnlyError()
  }
}

export async function isInPrivateChannel(interaction: Interaction) {
  if (!interaction.inGuild() || !interaction.channelId) {
    return false
  }

  if (
    await Prisma.warningGuildPrivateChannel.findFirst({
      where: { id: interaction.channelId, guildId: interaction.guildId },
    })
  ) {
    return true
  }

  const channel =
    interaction.channel ??
    (await Discord.channels.fetch(interaction.channelId, {
      allowUnknownGuild: true,
    }))

  if (!channel || channel.isDMBased() || !channel.parentId) {
    return false
  }

  return !!(await Prisma.warningGuildPrivateChannel.findFirst({
    where: { id: channel.parentId, guildId: channel.guildId },
  }))
}

export function warningUrl(
  warning: Warning & { guild: WarningGuild; messages: WarningLogMessage[] },
  search = ""
) {
  const message = warning.messages.find((m) => m.main)

  const url = new URL(
    `https://discord.com/channels/${warning.guild.id}/${
      warning.guild.warnLogsChannel
    }/${message?.id ?? ""}`
  )

  url.search = search
  return url
}
