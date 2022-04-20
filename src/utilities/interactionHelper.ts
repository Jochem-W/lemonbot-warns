import {CommandInteraction, Constants, DiscordAPIError, GuildMember, User, UserResolvable} from "discord.js"

export default class InteractionHelper {
    static async fetchMemberOrUser(interaction: CommandInteraction, option: string, force?: boolean): Promise<GuildMember | User> {
        const user = interaction.options.getUser(option, true)
        try {
            return await interaction.guild!.members.fetch({user: user, force: force})
        } catch (e) {
            if ((e as DiscordAPIError).code !== Constants.APIErrors.UNKNOWN_MEMBER) {
                throw e
            }
        }

        return force ? await user.fetch(true) : user
    }

    static getName(user: UserResolvable): string {
        if (user instanceof GuildMember) {
            return `${user.user.tag}${user.nickname ? ` (${user.nickname})` : ""}`
        }

        if (user instanceof User) {
            return user.tag
        }

        throw new Error("Unsupported user type")
    }

    static getTag(user: UserResolvable): string {
        if (user instanceof GuildMember) {
            return user.user.tag
        }

        if (user instanceof User) {
            return user.tag
        }

        throw new Error("Unsupported user type")
    }
}