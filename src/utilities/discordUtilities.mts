import { Prisma } from "../clients.mjs"
import {
  ChannelNotFoundError,
  InvalidChannelTypeError,
  OwnerOnlyError,
} from "../errors.mjs"
import type { Warning, WarningGuild, WarningLogMessage } from "@prisma/client"
import {
  User,
  type Channel,
  type FetchChannelOptions,
  type PublicThreadChannel,
  type Snowflake,
  Client,
} from "discord.js"
import {
  ChannelType,
  DiscordAPIError,
  RESTJSONErrorCodes,
  Guild,
  Team,
  type FetchMemberOptions,
  type Interaction,
  type UserResolvable,
} from "discord.js"

export function uniqueName(user: User) {
  if (user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`
  }

  return user.username
}

export function userDisplayName(user: User) {
  if (user.globalName) {
    return user.globalName
  }

  return user.username
}

export async function tryFetchMember(
  data: { id: Snowflake; client: Client<true> } | Guild,
  options: FetchMemberOptions | UserResolvable,
) {
  let guild
  if (!(data instanceof Guild)) {
    const { id, client } = data
    guild = await client.guilds.fetch(id)
  } else {
    guild = data
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
  client: Client<true>,
  id: Snowflake,
  type: T | T[],
  options?: FetchChannelOptions,
) {
  const channel = await client.channels.fetch(id, options)
  if (!channel) {
    throw new ChannelNotFoundError(id)
  }

  if (
    (typeof type === "number" && channel.type !== type) ||
    (typeof type === "object" && !type.includes(channel.type as T))
  )
    if (channel.type !== type) {
      throw new InvalidChannelTypeError(channel, type)
    }

  return channel as T extends
    | ChannelType.PublicThread
    | ChannelType.AnnouncementThread
    ? PublicThreadChannel
    : Extract<Channel, { type: T }>
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
    (await interaction.client.channels.fetch(interaction.channelId))

  if (!channel || channel.isDMBased() || !channel.parentId) {
    return false
  }

  return !!(await Prisma.warningGuildPrivateChannel.findFirst({
    where: { id: channel.parentId, guildId: channel.guildId },
  }))
}

export function warningUrl(
  warning: Warning & { guild: WarningGuild; messages: WarningLogMessage[] },
  search = "",
) {
  const message = warning.messages.find((m) => m.main)

  const url = new URL(
    `https://discord.com/channels/${warning.guild.id}/${
      warning.guild.warnLogsChannel
    }/${message?.id ?? ""}`,
  )

  url.search = search
  return url
}
