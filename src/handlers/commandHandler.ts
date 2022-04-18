import {Interaction, Permissions} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"
import Embed from "../utilities/embed"

import {Commands} from "../commands"
import {Config} from "../config";

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

        const errorEmbed = Embed.make("Error", Config.failIcon).setColor("#ff0000")

        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You do not have permission to use this command")],
                ephemeral: true
            })
            return
        }

        const command = Commands.find(command => command.name === interaction.commandName)
        if (!command) {
            await interaction.reply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error)
            errorEmbed.setTitle("").setDescription(`${error}`)
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({embeds: [errorEmbed]})
            } else {
                await interaction.reply({embeds: [errorEmbed]})
            }
        }
    }
}