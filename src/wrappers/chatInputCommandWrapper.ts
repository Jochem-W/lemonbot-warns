import CommandWrapper from "../interfaces/commandWrapper"
import {
    ApplicationCommandOptionChoiceData,
    ChatInputCommandInteraction,
    MessageComponentInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
} from "discord.js"
import CommandPermissionBuilder from "../builders/commandPermissionBuilder"
import {Config} from "../config"

export default abstract class ChatInputCommandWrapper implements CommandWrapper {
    readonly builder = new SlashCommandBuilder()
    readonly permissionsBuilder = CommandPermissionBuilder.getDefault()
    readonly name
    readonly memberPermissions

    protected constructor(name: string, description: string, memberPermissions?: PermissionResolvable) {
        this.builder.setName(name)
            .setDescription(description)
            .setDefaultPermission(false)
        this.name = name
        this.memberPermissions = memberPermissions ?? Config.requiredPermissions ?? undefined
    }

    abstract getAutocomplete(option: ApplicationCommandOptionChoiceData): Promise<ApplicationCommandOptionChoiceData[]>

    abstract execute(interaction: ChatInputCommandInteraction): Promise<void>

    abstract executeComponent(interaction: MessageComponentInteraction, ...args: string[]): Promise<void>

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}