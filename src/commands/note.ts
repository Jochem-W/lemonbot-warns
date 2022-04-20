import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"

/**
 * @description Slash command which add a note to a member.
 */
export default class NoteCommand extends CommandWrapper {
    constructor() {
        super("note", "Add a note to a member")
        this.commandBuilder
            .addUserOption(option => option
                .setName("member")
                .setDescription("Target member")
                .setRequired(true))
            .addStringOption(option => option
                .setName("content")
                .setDescription("Main note content")
                .setRequired(true))
            .addStringOption(option => option
                .setName("title")
                .setDescription("Optional note title"))
            .addAttachmentOption(option => option
                .setName("image")
                .setDescription("Optional image attachment"))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        const member = await InteractionHelper.getMember(interaction, "member", true)
        const title = interaction.options.getString("title")
        const content = interaction.options.getString("content", true)

        const url = await Database.addNote(member, content, title ?? undefined, InteractionHelper.getName(member))

        const embed = Embed.make(`Added note to ${member.user.tag}`, undefined, "View notes")
            .setURL(url)

        if (title) {
            embed.addField(title, content)
        } else {
            embed.setDescription(content)
        }

        await interaction.editReply({embeds: [embed]})
    }
}