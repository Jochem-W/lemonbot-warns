import {Collection, Interaction, Permissions, Snowflake} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"
import Embed from "../utilities/embed"
import {Config} from "../config"

/**
 * Handler for interactions
 */
export default class CommandHandler extends HandlerWrapper {
    private readonly commands

    constructor(commands: Collection<Snowflake, { (interaction: Interaction): Promise<void> }>) {
        super("interactionCreate")
        this.commands = commands
    }

    async handle(interaction: Interaction) {
        if (!interaction.isApplicationCommand()) {
            return
        }

        const errorEmbed = Embed.make("Error", Config.failIcon).setColor("#ff0000")

        const command = this.commands.get(interaction.commandId)
        if (!command) {
            await interaction.reply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You do not have permission to use this command")],
                ephemeral: true,
            })
            return
        }

        try {
            await command(interaction)
        } catch (error) {
            console.error(error)
            errorEmbed.setTitle("Error").setDescription(`${error}`)
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({embeds: [errorEmbed]})
            } else {
                await interaction.reply({embeds: [errorEmbed]})
            }
        }
    }
}