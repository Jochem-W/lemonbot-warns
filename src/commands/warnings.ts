/**
 * @description Slash command which lists a user's warnings.
 */
import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, Permissions} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

export default class WarningsCommand extends CommandWrapper {
    constructor() {
        super("warnings", "Lists the warnings for a user.")
        this.slashCommand
            .addUserOption((option) => option
                .setName("user")
                .setDescription("The target user whose warnings will be listed.")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [
                    Embed.make("Error", undefined, "You do not have permission to execute this command")
                        .setColor("#ff0000"),
                ], ephemeral: true
            })

            return
        }

        await interaction.deferReply()

        const user = interaction.options.getUser("user", true);
        const embed = Embed.make(`Warnings for ${user.tag}`, user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }), "This user has no known warnings")
        const result = await Database.watchlistLookup(user);
        if (!result) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        embed.setTitle("View notes")
        embed.setURL(result.url)
        embed.addField("Current penalty level", result.currentPenalty ?? "")
        embed.addField("Reasons", result.reasons.length ? result.reasons.map(reason => ` - ${reason}`).join("\n") : "N/A")
        embed.addField("Last edited", `${result.lastEditedBy}\n<t:${Math.floor(result.lastEdited.getTime() / 1000)}:R>`)
        await interaction.editReply({embeds: [embed]})
    }
}