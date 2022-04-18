import {SlashCommandBuilder} from "@discordjs/builders";
import ApplicationCommandPermissionBuilder from "./applicationCommandPermissionBuilder";
import {Interaction} from "discord.js";

/**
 * Discord application command wrapper for interactions.
 */
export default class CommandWrapper {
    protected readonly permissionsBuilder = new ApplicationCommandPermissionBuilder()
    protected readonly commandBuilder = new SlashCommandBuilder()

    /**
     * @param name The name of the application command.
     * @param description The description of the application command.
     * @param defaultPermission The default permission of the application command.
     */
    constructor(name: string, description: string, defaultPermission = false) {
        this.commandBuilder
            .setName(name)
            .setDescription(description)
            .setDefaultPermission(defaultPermission)
    }

    /**
     * Gets the command's name.
     */
    get name() {
        return this.commandBuilder.name
    }

    /**
     * Returns the JSON representation of the command.
     */
    toJSON() {
        return this.commandBuilder.toJSON()
    }

    /**
     * Returns the JSON representation of the command permissions.
     */
    permissionsToJSON() {
        return this.permissionsBuilder.toJSON()
    }

    /**
     * Function that will be called when the command is executed.
     */
    async execute(interaction: Interaction) {
        throw new Error("Command not implemented.");
    }
}