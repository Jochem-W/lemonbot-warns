import {Interaction, MessageComponentInteraction, ModalSubmitInteraction} from "discord.js"
import {CustomId, InteractionScope} from "../models/customId"
import {RegisteredCommands} from "../commands"
import {Handler} from "../interfaces/handler"


export class InteractionHandler implements Handler<"interactionCreate"> {
    public readonly event = "interactionCreate"

    private static async handleMessageComponent(interaction: MessageComponentInteraction): Promise<void> {
        const data = CustomId.fromString(interaction.customId)
        if (data.scope !== InteractionScope.Instance) {
            return
        }

        const command = RegisteredCommands.get(data.primary)
        if (!command) {
            throw new Error(`Command ${data.primary} not found`)
        }

        if (!command.handleMessageComponent) {
            throw new Error(`Command ${command} does not support static message component interactions`)
        }

        await command.handleMessageComponent(interaction, data)
    }

    private static async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
        const data = CustomId.fromString(interaction.customId)
        if (data.scope !== InteractionScope.Instance) {
            return
        }

        const command = RegisteredCommands.get(data.primary)
        if (!command) {
            throw new Error(`Command ${data.primary} not found`)
        }

        if (!command.handleModalSubmit) {
            throw new Error(`Command ${command} does not support static message component interactions`)
        }

        await command.handleModalSubmit(interaction, data)
    }

    public async handle(interaction: Interaction): Promise<void> {
        try {
            if (interaction instanceof MessageComponentInteraction) {
                await InteractionHandler.handleMessageComponent(interaction)
                return
            }

            if (interaction instanceof ModalSubmitInteraction) {
                await InteractionHandler.handleModalSubmit(interaction)
                return
            }
        } catch (e) {
            console.error("Encountered an unhandled error", e, "while handling interaction", interaction)
        }
    }
}