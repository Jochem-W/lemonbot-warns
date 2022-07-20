import {
    CollectedInteraction,
    CommandInteraction,
    DiscordAPIError,
    Guild,
    GuildMember,
    Interaction,
    InteractionCollector,
    RESTJSONErrorCodes,
    UserResolvable,
} from "discord.js"
import {Duration} from "luxon"
import {ResponseBuilder} from "./responseBuilder"

export abstract class InteractionUtilities {
    public static async collect(interaction: CommandInteraction): Promise<InteractionCollector<CollectedInteraction>> {
        return new InteractionCollector(interaction.client, {
            channel: interaction.channel ?? interaction.channelId,
            guild: interaction.guild ?? interaction.guildId ?? undefined,
            message: await interaction.fetchReply(),
            idle: Duration.fromDurationLike({minutes: 15}).toMillis(),
            dispose: true,
        }).on("end", async () => {
            try {
                const reply = await interaction.fetchReply()
                await interaction.editReply(ResponseBuilder.disable({
                    embeds: reply.embeds,
                    components: reply.components,
                    files: reply.attachments.toJSON(),
                }))
            } catch (e) {
                console.error("Unhandled exception", e, "when handling interaction", interaction)
            }
        })
    }

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