import {AutocompleteInteraction, CommandInteraction, Interaction, InteractionType} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import EmbedUtilities from "../utilities/embedUtilities"
import Config from "../config"
import {Commands} from "../commands"

/**
 * Handler for interactions
 */
export default class CommandHandler extends HandlerWrapper {
    constructor() {
        super("interactionCreate")
    }

    private static async handleAutocomplete(interaction: AutocompleteInteraction) {
        const command = Commands.get(interaction.commandId)
        if (!command) {
            throw new Error(`Command not found for ${interaction}`)
        }

        if (!command.getAutocomplete) {
            throw new Error(`Command ${command.name} does not support autocomplete`)
        }

        await interaction.respond(await command.getAutocomplete(interaction) ?? [])
    }

    private static async handleCommand(interaction: CommandInteraction): Promise<void> {
        const errorEmbed = EmbedUtilities.makeEmbed("Something went wrong while executing the command", Config.failIcon)
            .setColor("#ff0000")

        const command = Commands.get(interaction.commandId)
        if (!command) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("This command doesn't exist")],
                ephemeral: true,
            })
            return
        }

        if (command.memberPermissions && !interaction.memberPermissions?.has(command.memberPermissions, true)) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You don't have the required permissions")],
                ephemeral: true,
            })
            return
        }

        try {
            await command.execute(interaction, {ephemeral: !Config.privateChannels.includes(interaction.channelId)})
        } catch (error) {
            console.error(error)
            await interaction.editReply({embeds: [errorEmbed.setDescription(`${error}`)]})
        }
    }

    async handle(interaction: Interaction) {
        try {
            if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                await CommandHandler.handleAutocomplete(interaction as AutocompleteInteraction)
                return
            }

            if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
                await CommandHandler.handleCommand(interaction)
                return
            }
        } catch (e) {
            console.error("Encountered an unhandled error", e, "while handling interaction", interaction)
        }
    }
}