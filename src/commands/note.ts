/**
 * @description Slash command which add a note to a user.
 */
import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, GuildMember, Permissions} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

export default class NoteCommand extends CommandWrapper {
    constructor() {
        super("note", "Add a note to a user.")
        this.slashCommand
            .addUserOption(option => option
                .setName("user")
                .setDescription("The target user.")
                .setRequired(true))
            .addStringOption(option => option
                .setName("content")
                .setDescription("Main content of the note.")
                .setRequired(true))
            .addStringOption(option => option
                .setName("title")
                .setDescription("The title of the note.")
                .setRequired(false))
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

        if (!interaction.member) {
            await interaction.reply({
                embeds: [
                    Embed.make("Unknown member", undefined, "The user you specified is not a member of this server.")
                        .setColor("#ff0000"),
                ],
            })

            return
        }

        await interaction.deferReply()

        const user = interaction.options.getUser("user", true)
        const content = interaction.options.getString("content", true)
        const title = interaction.options.getString("title", false)
        const member = interaction.member as GuildMember

        await Database.addNote(user, content, member, title ?? undefined)

        await interaction.editReply({
            embeds: [
                Embed.make(`Added note to ${user.tag} in ${interaction.guild!.name}`, undefined, title ?? undefined)
                    .setDescription(content)
                    .setColor("#00ff00"),
            ]
        })
    }
}