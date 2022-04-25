import {
    AutocompleteInteraction,
    Collection,
    CommandInteraction,
    Interaction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    Snowflake,
} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import EmbedUtilities from "../utilities/embedUtilities"
import {Config} from "../config"
import CommandWrapper from "../interfaces/commandWrapper"
import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"

/**
 * Handler for interactions
 */
export default class InteractionHandler extends HandlerWrapper {
    private readonly commands

    constructor(commands: Collection<Snowflake, CommandWrapper>) {
        super("interactionCreate")
        this.commands = commands
    }

    async handle(interaction: Interaction) {
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
    }

    private async handleCommand(interaction: CommandInteraction) {
        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId)})

        const errorEmbed = EmbedUtilities.makeEmbed("Something went wrong while executing the command", Config.failIcon)
            .setColor("#ff0000")

        const command = this.commands.get(interaction.commandId)
        if (!command) {
            await interaction.editReply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        if (command.memberPermissions && !interaction.memberPermissions?.has(command.memberPermissions, true)) {
            await interaction.editReply({embeds: [errorEmbed.setTitle("You don't have the required permissions")]})
            return
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error)
            await interaction.editReply({embeds: [errorEmbed.setDescription(`${error}`)]})
        }
    }

    private async handleMessageComponent(interaction: MessageComponentInteraction) {
        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId)})

        throw new Error("Method not implemented.")
    }

    private async handleAutocomplete(interaction: AutocompleteInteraction) {
        const command = this.commands.get(interaction.commandId)
        if (!(command instanceof ChatInputCommandWrapper)) {
            return
        }

        const option = interaction.options.getFocused(true)
        await interaction.respond(await command.getAutocomplete(option))
    }

    private async handleModalSubmit(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId ?? "")})

        throw new Error("Method not implemented.")
    }
}