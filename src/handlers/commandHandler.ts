import {AutocompleteInteraction, CommandInteraction, Interaction} from "discord.js"
import {RegisteredCommands} from "../commands"
import {Config} from "../config"
import {Handler} from "../interfaces/handler"
import {ResponseBuilder} from "../utilities/responseBuilder"

export class CommandHandler implements Handler<"interactionCreate"> {
    public readonly event = "interactionCreate"

    private static async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = RegisteredCommands.get(interaction.commandId)
        if (!command) {
            throw new Error(`Command not found for ${interaction}`)
        }

        if (!command.handleAutocompleteInteraction) {
            throw new Error(`Command ${command} does not support autocomplete`)
        }

        await interaction.respond(await command.handleAutocompleteInteraction(interaction) ?? [])
    }

    private static async handleCommand(interaction: CommandInteraction): Promise<void> {
        const command = RegisteredCommands.get(interaction.commandId)
        if (!command) {
            throw new Error(`Command not found for ${interaction}`)
        }

        if (command.builder.default_member_permissions &&
            !interaction.memberPermissions?.has(BigInt(command.builder.default_member_permissions), true)) {
            throw new Error(`You don't have the required permissions for this command`)
        }

        await command.handleCommandInteraction(interaction)
    }

    public async handle(interaction: Interaction): Promise<void> {
        if (interaction instanceof AutocompleteInteraction) {
            await CommandHandler.handleAutocomplete(interaction)
            return
        }

        try {
            if (interaction instanceof CommandInteraction) {
                await interaction.deferReply({ephemeral: !Config.privateChannels.includes(interaction.channelId)})
                await CommandHandler.handleCommand(interaction)
                return
            }
        } catch (e) {
            if (!interaction.replied) {
                throw e
            }

            await interaction.editReply({
                embeds: [
                    ResponseBuilder.makeEmbed("An error has occurred", Config.failIcon, `${e}`)
                        .setColor("#ff0000"),
                ],
            })
        }
    }
}