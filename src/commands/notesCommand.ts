import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ApplicationCommandOptionChoiceData, ChatInputCommandInteraction, MessageComponentInteraction} from "discord.js"
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

    async executeComponent(interaction: MessageComponentInteraction, id: string) {
        const data = await InteractionUtilities.generateNotesData(interaction, id)

        await interaction.editReply(ResponseUtilities.generateNotesResponse(data))
    }

    getAutocomplete(option: ApplicationCommandOptionChoiceData): Promise<ApplicationCommandOptionChoiceData[]> {
        return Promise.resolve([])
    }
}