import {Interaction, MessageComponentInteraction, ModalSubmitInteraction} from "discord.js"
import HandlerWrapper from "../wrappers/handlerWrapper"
import EmbedUtilities from "../utilities/embedUtilities"
import {Config} from "../config"

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
                if (!guild) {
                    throw new Error(`${interaction} has to be in a guild`)
                }

                const [userId, channelId] = args
                if (!userId || !channelId) {
                    throw new Error(`${interaction.customId} is invalid`)
                }

                if (interaction.user.id !== userId) {
                    await interaction.reply({
                        embeds: [EmbedUtilities.makeEmbed("Something went wrong while handling this interaction",
                            Config.failIcon,
                            "You can't use this component!")],
                        ephemeral: true,
                    })
                    return
                }

                await interaction.deferUpdate()
                await guild.channels.delete(channelId, "The warn was dismissed by the user")
                break
            default:
                throw new Error(`${interaction.customId} is invalid`)
            }
            break
        default:
            throw new Error(`${interaction.customId} is invalid`)
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