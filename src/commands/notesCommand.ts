import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import DatabaseUtilities from "../utilities/databaseUtilities"
import ResponseUtilities, {NotesData} from "../utilities/responseUtilities"

/**
 * @description Slash command which lists notes on a user.
 */
export default class NotesCommand extends ChatInputCommandWrapper {
    constructor() {
        super("notes", "List a user's notes")
        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user", true)
        const data: NotesData = {
            user: user,
            entry: await DatabaseUtilities.getEntry(user) ?? undefined,
            blocks: [],
        }

        if (data.entry) {
            for await (const block of DatabaseUtilities.getNotes(user)) {
                data.blocks.push(block)
            }
        }

        await interaction.editReply(ResponseUtilities.generateNotesResponse(data))
    }
}