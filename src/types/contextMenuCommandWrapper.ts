import CommandWrapper from "../interfaces/commandWrapper"
import {ContextMenuCommandBuilder, ContextMenuCommandInteraction, ContextMenuCommandType} from "discord.js"
import CommandPermissionBuilder from "./commandPermissionBuilder"

export default class ContextMenuCommandWrapper implements CommandWrapper {
    readonly builder = new ContextMenuCommandBuilder()
    readonly permissionsBuilder = new CommandPermissionBuilder()
    readonly name

    constructor(name: string, type: ContextMenuCommandType) {
        this.builder.setName(name)
            .setType(type)
            .setDefaultPermission(false)
        this.name = name
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