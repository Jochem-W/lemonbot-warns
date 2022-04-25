import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction, User} from "discord.js"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import ResponseUtilities, {NoteData} from "../utilities/responseUtilities"
import NotionUtilities from "../utilities/notionUtilities"
import {DateTime} from "luxon"

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
                .setName("body")
                .setDescription("Main note body")
                .setRequired(true))
            .addStringOption(option => option
                .setName("title")
                .setDescription("Optional note title"))
            .addAttachmentOption(option => option
                .setName("attachment")
                .setDescription("Optional file attachment"))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const data: NoteData = {
            author: await InteractionUtilities.fetchMemberOrUser({
                client: interaction.client,
                user: interaction.user,
            }) as User,
            target: await InteractionUtilities.fetchMemberOrUser({
                client: interaction.client,
                guild: interaction.guild ?? interaction.guildId ?? undefined,
                user: interaction.options.getUser("user", true),
            }),
            title: interaction.options.getString("title") ?? undefined,
            body: interaction.options.getString("body", true),
            attachment: interaction.options.getAttachment("attachment") ?? undefined,
            url: "",
            timestamp: DateTime.fromMillis(interaction.createdTimestamp),
        }

        const content = await NotionUtilities.generateNote(data)
        data.url = await DatabaseUtilities.addNote(data.target, content, InteractionUtilities.getName(data.target))

        await interaction.editReply(ResponseUtilities.generateNoteResponse(data))
    }
}