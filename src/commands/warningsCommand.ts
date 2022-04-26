import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ApplicationCommandOptionChoiceData, ChatInputCommandInteraction, MessageComponentInteraction} from "discord.js"
import DatabaseUtilities from "../utilities/databaseUtilities"
import ResponseUtilities, {WarningsData} from "../utilities/responseUtilities"

/**
 * @description Slash command which lists a user's warnings.
 */
export default class WarningsCommand extends ChatInputCommandWrapper {
    constructor() {
        super("warnings", "List a user's warnings")
        this.builder
            .addUserOption((option) => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user", true)
        const data: WarningsData = {
            user: user,
            entry: await DatabaseUtilities.getEntry(user) ?? undefined,
            requester: interaction.user,
        }

        await interaction.editReply(ResponseUtilities.generateWarningsResponse(data, interaction))
    }

    getAutocomplete(option: ApplicationCommandOptionChoiceData): Promise<ApplicationCommandOptionChoiceData[]> {
        throw new Error("Method not implemented")
    }

    executeComponent(interaction: MessageComponentInteraction, ...args: string[]): Promise<void> {
        throw new Error("Method not implemented")
    }
}