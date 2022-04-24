import CommandWrapper from "../interfaces/commandWrapper"
import {
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    ContextMenuCommandType,
    PermissionResolvable,
} from "discord.js"
import CommandPermissionBuilder from "./commandPermissionBuilder"
import {Config} from "../config"

export default class ContextMenuCommandWrapper implements CommandWrapper {
    readonly builder = new ContextMenuCommandBuilder()
    readonly permissionsBuilder = new CommandPermissionBuilder()
    readonly name
    readonly memberPermissions?: PermissionResolvable

    constructor(name: string, type: ContextMenuCommandType, memberPermissions?: PermissionResolvable) {
        this.builder.setName(name)
            .setType(type)
            .setDefaultPermission(false)
        this.name = name
        this.memberPermissions = memberPermissions ?? Config.requiredPermissions ?? undefined
    }

    execute(interaction: ContextMenuCommandInteraction): Promise<void> {
        return Promise.resolve(undefined)
    }

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}