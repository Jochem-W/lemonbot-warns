import CommandWrapper from "../interfaces/commandWrapper"
import {
    ApplicationCommandOptionChoiceData,
    ChatInputCommandInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
} from "discord.js"
import CommandPermissionBuilder from "../builders/commandPermissionBuilder"
import {Config} from "../config"

export default class ChatInputCommandWrapper implements CommandWrapper {
    readonly builder = new SlashCommandBuilder()
    readonly permissionsBuilder = new CommandPermissionBuilder()
    readonly name
    readonly memberPermissions?: PermissionResolvable

    constructor(name: string, description: string, memberPermissions?: PermissionResolvable) {
        this.builder.setName(name)
            .setDescription(description)
            .setDefaultPermission(false)
        this.name = name
        this.memberPermissions = memberPermissions ?? Config.requiredPermissions ?? undefined
    }

    async getAutocomplete(option: ApplicationCommandOptionChoiceData): Promise<ApplicationCommandOptionChoiceData[]> {
        return []
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    }

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}