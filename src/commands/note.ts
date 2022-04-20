import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, GuildMember} from "discord.js"
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
                .setDescription("Optional note title"))
            .addAttachmentOption(option => option
                .setName("image")
                .setDescription("Optional image attachment"))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        const user = await InteractionHelper.fetchMemberOrUser(interaction, interaction.options.getUser("user", true))
        const title = interaction.options.getString("title")
        const content = interaction.options.getString("content", true)

        const url = await Database.addNote(user, content, title ?? undefined, InteractionHelper.getName(user))

        const tag = (user instanceof GuildMember ? user.user : user).tag
        const embed = Embed.make(`Added note to ${tag}`, undefined, "View notes")
            .setURL(url)

        if (title) {
            embed.addField(title, content)
        } else {
            embed.setDescription(content)
        }

        await interaction.editReply({embeds: [embed]})
    }
}