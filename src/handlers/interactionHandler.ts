import {Interaction, InteractionType, MessageComponentInteraction, ModalSubmitInteraction} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import {InteractionScope, parseCustomId} from "../models/customId"
import {Commands} from "../commands"

/**
 * Handler for interactions
 */
export default class InteractionHandler extends HandlerWrapper {
    constructor() {
        super("interactionCreate")
    }

    private static async handleMessageComponent(interaction: MessageComponentInteraction) {
        const data = parseCustomId(interaction.customId)
        if (data.scope !== InteractionScope.Local) {
            return
        }

        const command = Commands.get(data.primary)
        if (!command) {
            throw new Error(`Command ${data.primary} not found`)
        }

        await command.handleMessageComponent(interaction, data)
    }

    private static async handleModalSubmit(interaction: ModalSubmitInteraction) {
        const data = parseCustomId(interaction.customId)
        if (data.scope !== InteractionScope.Local) {
            return
        }

        const command = Commands.get(data.primary)
        if (!command) {
            throw new Error(`Command ${data.primary} not found`)
        }

        await command.handleModalSubmit(interaction, data)
    }

    async handle(interaction: Interaction) {
        try {
            if (interaction.type === InteractionType.MessageComponent) {
                await InteractionHandler.handleMessageComponent(interaction as MessageComponentInteraction)
                return
            }

            if (interaction.type === InteractionType.ModalSubmit) {
                await InteractionHandler.handleModalSubmit(interaction as ModalSubmitInteraction)
                return
            }
        } catch (e) {
            console.error("Encountered an unhandled error", e, "while handling interaction", interaction)
        }
    }
}