import {
    DiscordAPIError,
    FetchMemberOptions,
    Guild,
    GuildMember,
    Interaction,
    RESTJSONErrorCodes,
    Team,
    UserResolvable,
} from "discord.js"
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
        const options: FetchMemberOptions = {
            user: user,
        }

        if (force !== undefined) {
            options.force = force
        }

        return await guild?.members.fetch(options) ?? null
    } catch (e) {
        if (e instanceof DiscordAPIError && e.code === RESTJSONErrorCodes.UnknownMember) {
            return null
        }

        throw e
    }
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