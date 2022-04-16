import {SlashCommandBuilder} from "@discordjs/builders"
import {Interaction} from "discord.js"

/**
 * @description Slash command wrapper for interactions.
 */
export default class CommandWrapper {
    protected readonly slashCommand: SlashCommandBuilder

    /**
     * @param name The name of slash command.
     * @param description The description that will be shown on the command.
     */
    constructor(name: string, description: string) {
        this.slashCommand = new SlashCommandBuilder()
            .setName(name.toLowerCase())
            .setDescription(description)
    }

    /**
     * @description Returns the internal slash command's JSON structure.
     */
    json() {
        return this.slashCommand.toJSON()
    }

    /**
     * @description Custom code that will be run when an interaction is detected with the same name.
     * @param interaction The command interaction that was triggered.
     */
    async execute(interaction: Interaction) {
    }
}