import {Interaction, Permissions} from "discord.js"
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

        const command = Commands.find(command => command.json().name === interaction.commandName)
        if (!command) {
            return
        }

        // handle any potential errors, and prevent them from crashing the bot
        try {
            if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
                await interaction.reply({
                    embeds: [
                        Embed.make("Error", undefined, "You do not have permission to execute this command.")
                            .setColor("#ff0000"),
                    ], ephemeral: true
                })
                return
            }

            await command.execute(interaction);
        } catch (error) {
            console.error(error)

            const errorEmbed = Embed.make("Error", undefined, "An error occurred while executing the command")
                .setColor("#ff0000")

            await (interaction.replied || interaction.deferred ? interaction.editReply({embeds: [errorEmbed]}) : interaction.reply({embeds: [errorEmbed]}))
        }
    }
}