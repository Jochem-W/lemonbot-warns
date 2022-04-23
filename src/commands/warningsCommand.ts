import ChatInputCommandWrapper from "../types/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"

/**
 * @description Slash command which lists a user's warnings.
 */
export default class WarningsCommand extends ChatInputCommandWrapper {
    constructor() {
        super("warnings", "List a user's warnings")
        this.builder
            .addUserOption((option) => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply()

        const user = interaction.options.getUser("user", true)
        const embed = Embed.make(`Warnings for ${user.tag}`, user.displayAvatarURL({size: 4096}),
            "This user has no known warnings")
        const result = await Database.getEntry(user)
        if (!result) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        embed.setTitle("View notes")
        embed.setURL(result.url)
        embed.addFields([{
            name: "Current penalty level",
            value: result.currentPenaltyLevel,
        }, {
            name: "Reasons",
            value: result.reasons.length ? result.reasons.map(reason => ` - ${reason}`).join("\n") : "N/A",
        }, {
            name: "Last edited",
            value: `${result.lastEditedBy}\n<t:${result.lastEditedTime.toUnixInteger()}:R>`,
        }])

        await interaction.editReply({embeds: [embed]})
    }
}