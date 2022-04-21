import CommandPermissionBuilder from "../types/commandPermissionBuilder"
import {Interaction} from "discord.js"
import {ContextMenuCommandBuilder, SlashCommandBuilder} from "@discordjs/builders"
import {APIApplicationCommandPermission, RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types/v10"

/**
 * Discord application command wrapper for interactions.
 */
export default interface CommandWrapper {
    readonly name: string
    readonly builder: SlashCommandBuilder | ContextMenuCommandBuilder
    readonly permissionsBuilder: CommandPermissionBuilder

    /**
     * Returns the JSON representation of the command.
     */
    toJSON(): RESTPostAPIApplicationCommandsJSONBody

    /**
     * Returns the JSON representation of the command permissions.
     */
    permissionsToJSON(): APIApplicationCommandPermission[]

    /**
     * Function that will be called when the command is executed.
     */
    execute(interaction: Interaction): Promise<void>
}