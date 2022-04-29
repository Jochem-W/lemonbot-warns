import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionsBitField} from "discord.js"
import ResponseUtilities, {WarningsData} from "../utilities/responseUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"

export default class WarningsCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableWarningsCommand,
            "warnings",
            "List a user's warnings.",
            PermissionsBitField.Flags.ModerateMembers)
        this.commandBuilder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user.")
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
        const user = this.interaction.options.getUser("user", true)
        const data: WarningsData = {
            user: user,
            entry: await DatabaseUtilities.getEntry(user) ?? undefined,
            requester: this.interaction.user,
        }

        await this.interaction.editReply(ResponseUtilities.generateWarningsResponse(data, this.interaction))
    }
}