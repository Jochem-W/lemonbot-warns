import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteCommand extends CommandWrapper {
    constructor() {
        super("note", "Add a note to a user")
        this.commandBuilder
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
            .addAttachmentOption(option => option
                .setName("image")
                .setDescription("Optional image attachment")
                .setRequired(false))
    }

    async execute(interaction: CommandInteraction) {
        const member = await InteractionHelper.getMember(interaction)
        if (!member) {
            return
        }

        await interaction.deferReply()

        const content = interaction.options.getString("content", true)
        const title = interaction.options.getString("title")

        await Database.addNote(member, content, title ?? undefined, InteractionHelper.getName(member))

        await interaction.editReply({
            embeds: [
                Embed.make(`Added note to ${member.user.tag}`, undefined, title ?? undefined)
                    .setDescription(content),
            ]
        })
    }
}