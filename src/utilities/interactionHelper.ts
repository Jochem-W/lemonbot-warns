import {CommandInteraction, Constants, DiscordAPIError, GuildMember, User, UserResolvable} from "discord.js"

export default class InteractionHelper {
    static async getMember(interaction: CommandInteraction, option: string, required: true): Promise<GuildMember>
    static async getMember(interaction: CommandInteraction, option: string, required?: boolean): Promise<GuildMember | null>
    static async getMember(interaction: CommandInteraction, option: string, required?: boolean) {
        const user = interaction.options.getUser(option, required)
        if (!user && !required) {
            return null
        }

        return interaction.guild?.members.fetch(user!);
    }

    static async fetchMemberOrUser(interaction: CommandInteraction, user: UserResolvable, force?: boolean) {
        try {
            return await interaction.guild!.members.fetch({user: user, force: force})
        } catch (e) {
            if ((e as DiscordAPIError).code !== Constants.APIErrors.UNKNOWN_MEMBER) {
                throw e
            }
        }

        return await interaction.client.users.fetch(user, {force: force})
    }

    static getName(user: UserResolvable) {
        if (user instanceof GuildMember) {
            return `${user.user.tag}${user.nickname ? ` (${user.nickname})` : ""}`
        }

        if (user instanceof User) {
            return user.tag
        }

        throw new Error("Unsupported user type")
    }
}