import {Interaction, MessageComponentInteraction, ModalSubmitInteraction} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"

/**
 * Handler for interactions
 */
export default class InteractionHandler extends HandlerWrapper {
    constructor() {
        super("interactionCreate")
    }

    private static async handleMessageComponent(interaction: MessageComponentInteraction) {
        const [scope, command, subcommand, ...args] = interaction.customId.split(":")
        if (scope !== "global") {
            return
        }

        const guild = interaction.inGuild() ?
            (interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId)) :
            undefined

        switch (command) {
        case "warn":
            switch (subcommand) {
            case "dismiss":
                if (args.length !== 1) {
                    throw new Error(`${command} ${subcommand} invalid arguments`)
                }

                if (!guild) {
                    throw new Error(`${command} ${subcommand} must be in a server`)
                }

                await interaction.deferUpdate()
                await guild.channels.delete(args[0]!)
                break
            default:
                throw new Error(`Unknown ${command} subcommand ${args[0]}`)
            }
            break
        default:
            throw new Error(`Unknown command: ${command}`)
        }
    }

    private static async handleModalSubmit(interaction: ModalSubmitInteraction) {
        const [scope, command, ...args] = interaction.customId.split(":")
        if (scope !== "global") {
            return
        }

        switch (command) {
        default:
            throw new Error(`Unknown command: ${command} ${args.join(" ")}`)
        }
    }

    async handle(interaction: Interaction) {
        try {
            if (interaction.isMessageComponent()) {
                await InteractionHandler.handleMessageComponent(interaction)
                return
            }

            if (interaction.isModalSubmit()) {
                await InteractionHandler.handleModalSubmit(interaction)
                return
            }
        } catch (e) {
            console.error("Encountered an unhandled error", e, "while handling interaction", interaction)
        }
    }
}