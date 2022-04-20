import {CommandInteraction, Constants, DiscordAPIError, GuildMember, User, UserResolvable} from "discord.js"
import Embed from "./embed"
import {Config} from "../config";

export default class InteractionHelper {
    static async resolveUser(interaction: CommandInteraction, user: UserResolvable, force = false) {
        let memberOrUser: GuildMember | User | undefined
        try {
            memberOrUser = await interaction.guild?.members.fetch({user: user, force: force})
        } catch (e) {
            if ((e as DiscordAPIError).code !== Constants.APIErrors.UNKNOWN_MEMBER) {
                throw e
            }
        }

        if (!memberOrUser) {
            memberOrUser = await interaction.client.users.fetch(user, {force: force})
        }

        return memberOrUser
    }

    static async getMember(interaction: CommandInteraction, option = "user") {
        const user = interaction.options.getUser(option, true)
        let member: GuildMember | undefined
        try {
            member = await interaction.guild!.members.fetch(user)
        } catch (e) {
            if ((e as DiscordAPIError).code !== Constants.APIErrors.UNKNOWN_MEMBER) {
                throw e
            }
        }

        if (member) {
            return member
        }

        const embed = Embed.make("Unknown member", Config.failIcon, "The user you specified is not a member of this server")
            .setColor("#ff0000")

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({embeds: [embed]})
        } else {
            await interaction.reply({embeds: [embed]})
        }

        return null
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