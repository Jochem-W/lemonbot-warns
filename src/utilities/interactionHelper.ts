import {CommandInteraction, Constants, DiscordAPIError, GuildMember} from "discord.js"
import Embed from "./embed"

export default class InteractionHelper {
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

        const embed = Embed.make("Unknown member", undefined, "The user you specified is not a member of this server")
            .setColor("#ff0000")

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({embeds: [embed]})
        } else {
            await interaction.reply({embeds: [embed]})
        }

        return null
    }
}