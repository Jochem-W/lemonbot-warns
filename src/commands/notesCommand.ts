import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import ResponseUtilities from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"

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
        const data = await InteractionUtilities.generateNotesData(interaction,
            interaction.options.getUser("user", true))

        await interaction.editReply(ResponseUtilities.generateNotesResponse(data))
    }
}