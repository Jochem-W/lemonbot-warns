import {Interaction} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"
import Embed from "../utilities/embed"

import {Commands} from "../commands"

/**
 * @description Handler for events on the Discord API, via discord.js
 */
export default class CommandHandler extends HandlerWrapper {
    constructor() {
        super("interactionCreate", "CommandHandler")
    }

    async handle(...args: any) {
        const [[interaction]]: [[Interaction]] = args

        if (!interaction.isApplicationCommand()) {
            return
        }

        const command = Commands.find((command) => command.json().name === interaction.commandName)
        if (!command) {
            return
        }

        // handle any potential errors, and prevent them from crashing the bot
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error)

            const errorEmbed = Embed.make("Error", "An error occurred while executing the command")
                .setColor("#ff0000")

            await (interaction.replied ? interaction.editReply({embeds: [errorEmbed]}) : interaction.reply({embeds: [errorEmbed]}))
        }
    }
}