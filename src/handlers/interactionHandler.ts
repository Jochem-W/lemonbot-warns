import {
    AutocompleteInteraction,
    CommandInteraction,
    Interaction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import EmbedUtilities from "../utilities/embedUtilities"
import {Config} from "../config"
import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import StringUtilities from "../utilities/stringUtilities"
import {Commands} from "../commands"

/**
 * Handler for interactions
 */
export default class InteractionHandler extends HandlerWrapper {
    constructor() {
        super("interactionCreate")
    }

    async handle(interaction: Interaction) {
        try {
            if (interaction.isCommand()) {
                return await this.handleCommand(interaction)
            }

            if (interaction.isMessageComponent()) {
                return await this.handleMessageComponent(interaction)
            }

            if (interaction.isAutocomplete()) {
                return await this.handleAutocomplete(interaction)
            }

            if (interaction.isModalSubmit()) {
                return await this.handleModalSubmit(interaction)
            }
        } catch (e) {
            console.error(`Uncaught error while handling interaction`, interaction, e)
        }
    }

    private async handleCommand(interaction: CommandInteraction): Promise<void> {
        const errorEmbed = EmbedUtilities.makeEmbed("Something went wrong while executing the command", Config.failIcon)
            .setColor("#ff0000")

        const command = Commands.get(interaction.commandId)
        if (!command) {
            await interaction.reply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        if (command.memberPermissions && !interaction.memberPermissions?.has(command.memberPermissions, true)) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You don't have the required permissions")],
                ephemeral: true,
            })
            return
        }

        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId)})

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error)
            await interaction.editReply({embeds: [errorEmbed.setDescription(`${error}`)]})
        }
    }

    private async handleMessageComponent(interaction: MessageComponentInteraction): Promise<void> {
        const errorEmbed = EmbedUtilities.makeEmbed("Something went wrong while executing the command", Config.failIcon)
            .setColor("#ff0000")

        // TODO: use commandId
        const [commandId, ephemeral, sourceId, args] = StringUtilities.split(interaction.customId, /:/g, 3)

        if (!commandId || !ephemeral || !sourceId) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("Invalid parameters")],
                ephemeral: true,
            })
            return
        }

        if (interaction.user.id !== sourceId) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You can't use this button")],
                ephemeral: true,
            })
            return
        }

        const command = Commands.get(commandId)
        if (!command || !(command instanceof ChatInputCommandWrapper)) {
            await interaction.reply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        if (command.memberPermissions && !interaction.memberPermissions?.has(command.memberPermissions, true)) {
            await interaction.reply({
                embeds: [errorEmbed.setTitle("You don't have the required permissions")],
                ephemeral: true,
            })
            return
        }

        await interaction.deferReply({ephemeral: ephemeral === "true"})

        try {
            await command.executeComponent(interaction, ...(args ?? "").split(":"))
        } catch (error) {
            console.error(error)
            await interaction.editReply({embeds: [errorEmbed.setDescription(`${error}`)]})
        }
    }

    private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = Commands.get(interaction.commandId)
        if (!(command instanceof ChatInputCommandWrapper)) {
            return
        }

        const option = interaction.options.getFocused(true)
        await interaction.respond(await command.getAutocomplete(option))
    }

    private async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId ?? "")})

        throw new Error("Method not implemented")
    }
}