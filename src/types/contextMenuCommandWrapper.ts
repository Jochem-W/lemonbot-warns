import CommandWrapper from "../interfaces/commandWrapper"
import {ContextMenuCommandBuilder, ContextMenuCommandType} from "@discordjs/builders"
import {ContextMenuInteraction} from "discord.js"
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

    execute(interaction: ContextMenuInteraction): Promise<void> {
        return Promise.resolve(undefined)
    }

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}