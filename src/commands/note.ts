import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, GuildMember} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteCommand extends CommandWrapper {
    constructor() {
        super("note", "Add a note to a user")
        this.slashCommand
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("content")
                .setDescription("Main note content")
                .setRequired(true))
            .addStringOption(option => option
                .setName("title")
                .setDescription("Optional note title")
                .setRequired(false))
    }

    async execute(interaction: CommandInteraction) {
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

        const content = interaction.options.getString("content", true)
        const title = interaction.options.getString("title", false)

        await Database.addNote(user, content, member, title ?? undefined)

        await interaction.editReply({
            embeds: [
                Embed.make(`Added note to ${user.tag} in ${interaction.guild!.name}`, undefined, title ?? undefined)
                    .setDescription(content),
            ]
        })
    }
}