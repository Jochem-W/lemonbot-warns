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
  GuildMember,
  Interaction,
  RESTJSONErrorCodes,
  Team,
  UserResolvable,
} from "discord.js"
import { DateTime } from "luxon"
import { DefaultConfig } from "../models/config.mjs"
import { ChannelNotFoundError, InvalidChannelTypeError } from "../errors.mjs"

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}

export async function fetchMember(
  interaction: Interaction,
  user: UserResolvable,
  force?: boolean
): Promise<GuildMember | null> {
  const guild = await fetchGuild(interaction)
  try {
    const options: FetchMemberOptions = {
      user: user,
    }

    if (force !== undefined) {
      options.force = force
    }

    return (await guild?.members.fetch(options)) ?? null
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
  guild: Guild,
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
): Promise<Extract<GuildBasedChannel, { type: T }>>
export async function fetchChannel<T extends ChannelType>(
  client: Client,
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
): Promise<Extract<GuildBasedChannel, { type: T }>>
export async function fetchChannel<T extends ChannelType>(
  clientOrGuild: Client | Guild,
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
): Promise<Extract<GuildBasedChannel, { type: T }>> {
  const channel = await clientOrGuild.channels.fetch(id, options)
  if (!channel) {
    throw new ChannelNotFoundError(id)
  }

  if (channel.type !== type) {
    throw new InvalidChannelTypeError(channel, type)
  }

  return channel as Extract<GuildBasedChannel, { type: T }>
}

export async function fetchGuild(
  interaction: Interaction
): Promise<Guild | null> {
  if (!interaction.inGuild()) {
    return null
  }

  return (
    interaction.guild ??
    (await interaction.client.guilds.fetch(interaction.guildId))
  )
}

export async function isFromOwner(interaction: Interaction): Promise<boolean> {
  let application = interaction.client.application
  if (!application.owner) {
    application = await application.fetch()
    if (!application.owner) {
      throw new Error()
    }
  }

  if (application.owner instanceof Team) {
    return application.owner.members.has(interaction.user.id)
  }

  return application.owner.id === interaction.user.id
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
