/**
 * @description Slash command which warns a user.
 */
import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, Permissions} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

export default class WarnCommand extends CommandWrapper {
    constructor() {
        super("warn", "Warns a user.")
    }

    json() {
        return this.slashCommand
            .addUserOption(option => option
                .setName("user")
                .setDescription("The target user whose warnings will be listed.")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("The reason for the warning.")
                .setRequired(true))
            .addStringOption(option => option
                .setName("penalty")
                .setDescription("The new penalty level for the user.")
                .addChoices([
                    ["0: Nothing", "0: Nothing"],
                    ["1: Warning", "1: Warning"],
                    ["2: 24h Timeout", "2: 24h Timeout"],
                    ["3: 48h Timeout", "3: 48h Timeout"],
                    ["4: Ban/Blacklist", "4: Ban/Blacklist"]
                ])
                .setRequired(true))
            .toJSON()
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.editReply({
                embeds: [
                    Embed.make("No permission", undefined, "You do not have permission to execute this command."),
                ]
            })

            return
        }

        const user = interaction.options.getUser("user", true)
        const reason = interaction.options.getString("reason", true)
        const penalty = interaction.options.getString("penalty", true)

        await Database.watchlistUpdate(user, reason, penalty)

        const embed = Embed.make(`Warned ${user.tag}`, user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }), `Reason: ${reason}`)
        await interaction.editReply({embeds: [embed]})
    }
}