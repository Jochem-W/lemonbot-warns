import CommandWrapper from "../interfaces/commandWrapper"
import {
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    ContextMenuCommandType,
    PermissionResolvable,
} from "discord.js"
import CommandPermissionBuilder from "../builders/commandPermissionBuilder"
import {Config} from "../config"

export default abstract class ContextMenuCommandWrapper implements CommandWrapper {
    readonly builder = new ContextMenuCommandBuilder()
    readonly permissionsBuilder = new CommandPermissionBuilder()
    readonly name
    readonly memberPermissions

    protected constructor(name: string, type: ContextMenuCommandType, memberPermissions?: PermissionResolvable) {
        this.builder.setName(name)
            .setType(type)
            .setDefaultPermission(false)
        this.name = name
        this.memberPermissions = memberPermissions ?? Config.requiredPermissions ?? undefined
    }

    abstract execute(interaction: ContextMenuCommandInteraction): Promise<void>

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}