import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonComponent,
    ButtonStyle,
    CommandInteraction,
    ComponentType,
    Message,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    SelectMenuBuilder,
} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import {Config} from "../config"

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
     */
    async handleMessageComponent(interaction: MessageComponentInteraction): Promise<void> {
    }

    /**
     * Function that is called when a modal is submitted
     * @param interaction The interaction that was triggered.
     */
    async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
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
        const reply = await this.interaction.fetchReply()
        if (!(reply instanceof Message)) {
            await this.interaction.editReply({
                embeds: reply.embeds,
                components: reply.components?.map(row => {
                    row.components.map(component => {
                        if (component.type !== ComponentType.Button || component.style !== ButtonStyle.Link) {
                            component.disabled = true
                        }

                        return component
                    })
                    return row
                }),
            })
            return
        }

        await this.interaction.editReply({
            embeds: reply.embeds,
            components: reply.components?.map(row => new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(row.components.map(component => {
                    if (component instanceof ButtonComponent) {
                        const builder = new ButtonBuilder(component.data)
                        if (builder.data.style !== ButtonStyle.Link) {
                            builder.setDisabled(true)
                        }

                        return builder
                    }

                    return new SelectMenuBuilder(component.data)
                        .setDisabled(true)
                })),
            ),
        })
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