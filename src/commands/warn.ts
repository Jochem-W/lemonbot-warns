import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, DiscordAPIError, GuildMember, Permissions} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

/**
 * @description Slash command which warns a user.
 */
export default class WarnCommand extends CommandWrapper {
    constructor() {
        super("warn", "Warn a user.")
        this.slashCommand
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Concise warning reason, preferably only a couple of words")
                .setRequired(true))
            .addStringOption(option => option
                .setName("description")
                .setDescription("Extended warning description")
                .setRequired(true))
            .addStringOption(option => option
                .setName("penalty")
                .setDescription("New penalty level for the user")
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
                .setDescription("Send a DM to the user")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [
                    Embed.make("Error", undefined, "You do not have permission to execute this command.")
                        .setColor("#ff0000"),
                ], ephemeral: true
            })

            return
        }

        const user = interaction.options.getUser("user", true)
        let member: GuildMember | undefined
        try {
            member = await interaction.guild?.members.fetch(user)
        } catch (e) {
        }

        if (!member) {
            await interaction.reply({
                embeds: [
                    Embed.make("Unknown member", undefined, "The user you specified is not a member of this server.")
                        .setColor("#ff0000"),
                ],
            })

            return
        }

        await interaction.deferReply()

        const reason = interaction.options.getString("reason", true)
        const penalty = interaction.options.getString("penalty", true)

        const url = await Database.watchlistUpdate(user, reason, penalty, member)

        const embed = Embed.make(`Warned ${user.tag} in ${member.guild.name}`, user.displayAvatarURL({
            dynamic: true,
            size: 4096
        }), `Reason: ${reason}`)
            .addField("Notion page", url)
            .addField("New penalty level", penalty)

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