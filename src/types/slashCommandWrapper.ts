import CommandWrapper from "../interfaces/commandWrapper"
import {SlashCommandBuilder} from "@discordjs/builders"
import {CommandInteraction} from "discord.js"
import CommandPermissionBuilder from "./commandPermissionBuilder"

export default class SlashCommandWrapper implements CommandWrapper {
    readonly builder = new SlashCommandBuilder()
    readonly permissionsBuilder = new CommandPermissionBuilder()
    readonly name

    constructor(name: string, description: string) {
        this.builder.setName(name)
            .setDescription(description)
            .setDefaultPermission(false)
        this.name = name
    }

    execute(interaction: CommandInteraction): Promise<void> {
        return Promise.resolve(undefined)
    }

    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    toJSON() {
        return this.builder.toJSON()
    }
}