/**
 * @description Slash command which warns a user.
 */
import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, DiscordAPIError, GuildMember, Permissions} from "discord.js"
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
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Whether or not to notify the user of the warning.")
                .setRequired(true))
            .toJSON()
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [
                    Embed.make("No permission", undefined, "You do not have permission to execute this command."),
                ], ephemeral: true
            })

            return
        }

        if (!interaction.member) {
            await interaction.reply({
                embeds: [
                    Embed.make("Unknown member", "The user you specified is not a member of this server.")
                ],
            })

            return
        }

        await interaction.deferReply()

        const user = interaction.options.getUser("user", true)
        const reason = interaction.options.getString("reason", true)
        const penalty = interaction.options.getString("penalty", true)
        const member = interaction.member as GuildMember

        await Database.watchlistUpdate(user, reason, penalty, member)

        const embed = Embed.make(`Warned ${user.tag} in ${member.guild.name}`, user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }), `Reason: ${reason}`).addField("Penalty level", penalty)

        if (interaction.options.getBoolean("notify", true)) {
            try {
                await member.send({
                    embeds: [
                        Embed.make("Warning", undefined, `You have been warned in ${member.guild.name}.`)
                            .addField("Reason", reason)
                            .setColor("#ff0000"),
                    ],
                })

                embed.addField("Notification", "Successfully notified the user.")
            } catch (e) {
                if (e instanceof DiscordAPIError) {
                    embed.addField("Notification", `Error: ${e.message}`)
                } else {
                    embed.addField("Notification", "An unknown error occurred while notifying the user.")
                }
            }
        }

        await interaction.editReply({embeds: [embed]})
    }
}