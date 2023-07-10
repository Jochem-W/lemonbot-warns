import {
  ChannelNotFoundError,
  GuildOnlyError,
  InvalidChannelTypeError,
} from "../errors.mjs"
import {
  DiscordAPIError,
  RESTJSONErrorCodes,
  type Guild,
  type GuildMember,
  type Interaction,
  User,
  type TextBasedChannel,
} from "discord.js"

type Return<Type, Force extends boolean> = Force extends true
  ? Type
  : Type | null

export async function interactionGuild<T extends boolean>(
  interaction: Interaction,
  force?: T
): Promise<Return<Guild, T>> {
  if (interaction.guild) {
    return interaction.guild
  }

  if (!interaction.inGuild()) {
    if (force) {
      throw new GuildOnlyError()
    }

    return null as Return<Guild, T>
  }

  return await interaction.client.guilds.fetch(interaction.guildId)
}

export async function interactionMember<T extends boolean>(
  interaction: Interaction,
  options?: { force?: T; user?: User }
): Promise<Return<GuildMember, T>> {
  const force = options?.force ?? false
  const user = options?.user ?? interaction.user

  const guild = await interactionGuild(interaction, force)
  if (!guild) {
    return null as Return<GuildMember, T>
  }

  try {
    return await guild.members.fetch(user)
  } catch (e) {
    if (
      !(e instanceof DiscordAPIError) ||
      e.code !== RESTJSONErrorCodes.UnknownMember ||
      force
    ) {
      throw e
    }

    return null as Return<GuildMember, T>
  }
}

export async function interactionChannel<T extends boolean>(
  interaction: Interaction,
  force?: T
): Promise<Return<TextBasedChannel, T>> {
  if (interaction.channel) {
    return interaction.channel
  }

  if (!interaction.channelId) {
    if (force) {
      throw new GuildOnlyError()
    }

    return null as Return<TextBasedChannel, T>
  }

  const channel = await interaction.client.channels.fetch(interaction.channelId)
  if (!channel) {
    if (force) {
      throw new ChannelNotFoundError(interaction.channelId)
    }

    return null as Return<TextBasedChannel, T>
  }

  if (!channel.isTextBased()) {
    if (force) {
      throw new InvalidChannelTypeError(channel)
    }

    return null as Return<TextBasedChannel, T>
  }

  return channel
}
