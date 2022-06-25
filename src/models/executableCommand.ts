import {CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import Config from "../config"
import InteractionUtilities from "../utilities/interactionUtilities"
import {CustomId} from "./customId"

/**
 * A command that was executed by a user.
 */
export default abstract class ExecutableCommand<T extends CommandInteraction> {
    readonly interaction: T

    /**
     * Create a new ExecutableCommand from a CommandInteraction.
     * @param interaction The interaction that triggered this command.
     * @protected
     */
    protected constructor(interaction: T) {
        this.interaction = interaction
    }

    /**
     * Function that is called once on command execution.
     */
    abstract execute(): Promise<void>

    /**
     * Function that is called when a message component is interacted with.
     * @param interaction The interaction that was triggered.
     * @param data
     */
    async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId): Promise<void> {
    }

    /**
     * Function that is called when a modal is submitted
     * @param interaction The interaction that was triggered.
     * @param data
     */
    async handleModalSubmit(interaction: ModalSubmitInteraction, data: CustomId): Promise<void> {
    }

    /**
     * Function that is called once when the command has reached the end of its lifespan.
     */
    abstract cleanup(): Promise<void>

    /**
     * Disable all non-link buttons on the bot reply.
     * @protected
     */
    protected async disableButtons() {
        const channel = await this.interaction.client.channels.fetch(this.interaction.channelId)
        if (!channel?.isTextBased()) {
            throw new Error("Channel is not a text channel")
        }

        let message = await this.interaction.fetchReply()
        try {
            message = await channel.messages.fetch({
                message: message.id,
                force: true,
            })
        } catch (e) {
            if (!this.interaction.ephemeral) {
                console.warn("Couldn't find non-ephemeral bot message")
            }
        }

        const disabled = InteractionUtilities.disable({
            embeds: message.embeds,
            components: message.components.map(row => row.toJSON()),
        })

        await this.interaction.editReply(disabled)
    }

    protected async checkUser(interaction: MessageComponentInteraction) {
        if (interaction.user !== this.interaction.user) {
            await interaction.reply({
                embeds: [EmbedUtilities.makeEmbed("Something went wrong while handling this interaction",
                    Config.failIcon, "You can't use this component!")],
                ephemeral: true,
            })
            return false
        }

        return true
    }
}