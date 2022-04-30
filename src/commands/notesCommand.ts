import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionsBitField} from "discord.js"
import ResponseUtilities from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"

export default class NotesCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableNotesCommand, "notes", "List a user's notes.", PermissionsBitField.Flags.ModerateMembers)
        this.commandBuilder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user.")
                .setRequired(true))
    }
}

class ExecutableNotesCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        const data = await InteractionUtilities.generateNotesData(this.interaction,
            this.interaction.options.getUser("user", true))

        await this.interaction.editReply(ResponseUtilities.generateNotesResponse(data))
    }
}