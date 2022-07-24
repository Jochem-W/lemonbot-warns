import {DiscordAPIError, Guild, GuildMember, Interaction, RESTJSONErrorCodes, UserResolvable} from "discord.js"

export abstract class InteractionUtilities {
    public static async fetchGuild(interaction: Interaction): Promise<Guild | null> {
        if (!interaction.inGuild()) {
            return null
        }

        const guild = await interaction.client.guilds.fetch({guild: interaction.guild ?? interaction.guildId})
        if (!guild.name) {
            await guild.fetch()
        }

        return guild
    }

    public static async fetchMember(interaction: Interaction,
                                    user: UserResolvable,
                                    force?: boolean): Promise<GuildMember | null> {
        const guild = await InteractionUtilities.fetchGuild(interaction)
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
}