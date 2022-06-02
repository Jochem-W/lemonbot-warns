import SlashCommandConstructor from "../models/slashCommandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits, User} from "discord.js"
import ResponseUtilities, {NoteData} from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import NotionUtilities from "../utilities/notionUtilities"
import {DateTime} from "luxon"
import DatabaseUtilities from "../utilities/databaseUtilities"

export default class NoteCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableNoteCommand, "note", "Add a note to a user", PermissionFlagsBits.ModerateMembers)
        this.commandBuilder
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
                .setDescription("Optional note title to separate this note from previous notes"))
            .addAttachmentOption(option => option
                .setName("attachment")
                .setDescription("Optional file attachment"))
    }
}

class ExecutableNoteCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async execute() {
        const data: NoteData = {
            author: await InteractionUtilities.fetchMemberOrUser({
                client: this.interaction.client,
                user: this.interaction.user,
            }) as User,
            target: await InteractionUtilities.fetchMemberOrUser({
                client: this.interaction.client,
                guild: this.interaction.guild ?? this.interaction.guildId ?? undefined,
                user: this.interaction.options.getUser("user", true),
            }),
            title: this.interaction.options.getString("title") ?? undefined,
            body: this.interaction.options.getString("body", true),
            attachment: this.interaction.options.getAttachment("attachment") ?? undefined,
            url: "",
            timestamp: DateTime.fromMillis(this.interaction.createdTimestamp),
        }

        data.url = await DatabaseUtilities.addNotes(data.target, {
            content: await NotionUtilities.generateNote(data),
            name: InteractionUtilities.getName(data.target),
        })

        await this.interaction.editReply(ResponseUtilities.generateNoteResponse(data, this.interaction))
    }

    async cleanup() {
    }
}