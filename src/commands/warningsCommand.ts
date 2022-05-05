import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionsBitField} from "discord.js"
import ResponseUtilities, {WarningsData} from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"

export default class WarningsCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableWarningsCommand,
            "warnings",
            "List a user's warnings",
            PermissionsBitField.Flags.ModerateMembers)
        this.commandBuilder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }
}

class ExecutableWarningsCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        const notesData = await InteractionUtilities.generateNotesData(this.interaction,
            this.interaction.options.getUser("user", true))
        const warningsData: WarningsData = {
            user: notesData.user,
            entry: notesData.entry,
            requester: this.interaction.user,
        }

        await this.interaction.editReply(ResponseUtilities.generateWarningsResponse(warningsData,
            notesData,
            this.interaction))
    }
}