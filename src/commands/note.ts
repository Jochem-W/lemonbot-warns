import ChatInputCommandWrapper from "../types/chatInputCommandWrapper"
import {ChatInputCommandInteraction, GuildMember} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteCommand extends ChatInputCommandWrapper {
    constructor() {
        super("note", "Add a note to a user")
        this.builder
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

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply()

        const user = await InteractionHelper.fetchMemberOrUser(interaction.client,
            interaction.guild!,
            interaction.options.getUser("user", true))
        const title = interaction.options.getString("title")
        const content = interaction.options.getString("content", true)

        const url = await Database.addNote(user,
            {title: title ?? undefined, body: content},
            InteractionHelper.getName(user))

        const tag = (user instanceof GuildMember ? user.user : user).tag
        const embed = Embed.make(`Added note to ${tag}`, undefined, "View notes")
            .setURL(url)

        if (title) {
            embed.addFields([{
                name: title,
                value: content,
            }])
        } else {
            embed.setDescription(content)
        }

        await interaction.editReply({embeds: [embed]})
    }
}