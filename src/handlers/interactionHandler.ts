import {
    AutocompleteInteraction,
    Collection,
    CommandInteraction,
    Interaction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    Snowflake,
} from "discord.js"
import HandlerWrapper from "../types/handlerWrapper"
import Embed from "../utilities/embed"
import {Config} from "../config"
import CommandWrapper from "../interfaces/commandWrapper"
import ChatInputCommandWrapper from "../types/chatInputCommandWrapper"

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

        const errorEmbed = Embed.make("Error", Config.failIcon).setColor("#ff0000")

        const command = this.commands.get(interaction.commandId)
        if (!command) {
            await interaction.editReply({embeds: [errorEmbed.setTitle("This command doesn't exist")]})
            return
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error)
            await interaction.editReply({embeds: [errorEmbed.setTitle("Error").setDescription(`${error}`)]})
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
        await interaction.respond(command.getAutocomplete(option))
    }

    private async handleModalSubmit(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId ?? "")})

        throw new Error("Method not implemented.")
    }
}