import {DiscordAPIError, Guild, GuildMember, Interaction, RESTJSONErrorCodes, Team, UserResolvable} from "discord.js"
import {DefaultConfig} from "../models/config"

export async function fetchGuild(interaction: Interaction): Promise<Guild | null> {
    if (!interaction.inGuild()) {
        return null
    }

    const guild = await interaction.client.guilds.fetch({guild: interaction.guild ?? interaction.guildId})
    if (!guild.name) {
        await guild.fetch()
    }

    return guild
}

export async function fetchMember(interaction: Interaction,
                                  user: UserResolvable,
                                  force?: boolean): Promise<GuildMember | null> {
    const guild = await fetchGuild(interaction)
    try {
        return await guild?.members.fetch({
            user: user,
            force: force,
        }) ?? null
    } catch (e) {
        if (e instanceof DiscordAPIError && e.code === RESTJSONErrorCodes.UnknownMember) {
            return null
        }

        throw e
    }
}

export async function isFromOwner(interaction: Interaction): Promise<boolean> {
    if (!interaction.client.application) {
        throw new Error()
    }

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

    return application.owner === interaction.user
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