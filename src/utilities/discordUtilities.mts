import { Discord } from "../clients.mjs"
import {
  ChannelNotFoundError,
  GuildOnlyError,
  InvalidChannelTypeError,
  OwnerOnlyError,
} from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type { Warning } from "@prisma/client"
import type {
  Channel,
  FetchChannelOptions,
  PublicThreadChannel,
  Snowflake,
} from "discord.js"
import {
  ChannelType,
  DiscordAPIError,
  RESTJSONErrorCodes,
  Team,
} from "discord.js"
import type {
  FetchMemberOptions,
  Interaction,
  UserResolvable,
} from "discord.js"
import { DateTime } from "luxon"

const guild = await Discord.guilds.fetch(DefaultConfig.guild.id)

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}

export async function tryFetchMember(
  options: FetchMemberOptions | UserResolvable
) {
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
  const channel = await Discord.channels.fetch(id, options)
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
  if (!interaction.inGuild()) {
    return false
  }

  if (!interaction.channelId) {
    return false
  }

  if (DefaultConfig.guild.privateChannels.includes(interaction.channelId)) {
    return true
  }

  const channel =
    interaction.channel ?? (await Discord.channels.fetch(interaction.channelId))
  if (!channel || channel.isDMBased()) {
    return false
  }

  if (!channel.parentId) {
    return false
  }

  return DefaultConfig.guild.privateChannels.includes(channel.parentId)
}

export function warningUrl(warning: Warning, search = "") {
  const url = new URL(
    `https://discord.com/channels/${DefaultConfig.guild.id}/${
      DefaultConfig.guild.warnLogsChannel
    }/${warning.messageId ?? ""}`
  )

  url.search = search
  return url
}
