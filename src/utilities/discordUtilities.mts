import {
  ChannelNotFoundError,
  GuildOnlyError,
  InvalidChannelTypeError,
  OwnerOnlyError,
} from "../errors.mjs"
import { DefaultConfig } from "../models/config.mjs"
import type {
  FetchChannelOptions,
  GuildBasedChannel,
  Snowflake,
} from "discord.js"
import {
  ChannelType,
  Client,
  DiscordAPIError,
  FetchMemberOptions,
  Guild,
  Interaction,
  RESTJSONErrorCodes,
  Team,
  UserResolvable,
} from "discord.js"
import { DateTime } from "luxon"

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}

export async function fetchMember(
  interaction: Interaction,
  options: FetchMemberOptions | UserResolvable
) {
  const guild = await fetchGuild(interaction) // Possibly a bad idea because it can throw?
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
  clientOrGuild: Client | Guild,
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
) {
  const channel = await clientOrGuild.channels.fetch(id, options)
  if (!channel) {
    throw new ChannelNotFoundError(id)
  }

  if (channel.type !== type) {
    throw new InvalidChannelTypeError(channel, type)
  }

  return channel as Extract<GuildBasedChannel, { type: T }>
}

export async function fetchGuild(interaction: Interaction) {
  if (!interaction.inGuild()) {
    throw new GuildOnlyError()
  }

  return (
    interaction.guild ??
    (await interaction.client.guilds.fetch(interaction.guildId))
  )
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

export function isInPrivateChannel(interaction: Interaction) {
  if (!interaction.inGuild()) {
    return false
  }

  if (!interaction.channelId) {
    return false
  }

  return DefaultConfig.guild.privateChannels.includes(interaction.channelId)
}
