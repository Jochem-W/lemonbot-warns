import CommandPermissionBuilder from "../builders/commandPermissionBuilder"
import {CommandInteraction, ContextMenuCommandBuilder, PermissionResolvable, SlashCommandBuilder} from "discord.js"
import {APIApplicationCommandPermission, RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types/v10"

/**
 * Discord application command wrapper for interactions.
 */
export default interface CommandWrapper {
    readonly name: string
    readonly builder: SlashCommandBuilder | ContextMenuCommandBuilder
    readonly permissionsBuilder: CommandPermissionBuilder
    readonly memberPermissions?: PermissionResolvable

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
    execute(interaction: CommandInteraction): Promise<void>
}