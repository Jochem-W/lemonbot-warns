import {AutocompleteInteraction, CommandInteraction, Interaction} from "discord.js"
import {RegisteredCommands} from "../commands"
import {DefaultConfig} from "../models/config"
import {Handler} from "../interfaces/handler"
import {CommandNotFoundByIdError, NoAutocompleteHandlerError, NoPermissionError, reportError} from "../errors"
import {makeErrorEmbed} from "../utilities/responseBuilder"

export class CommandHandler implements Handler<"interactionCreate"> {
    public readonly event = "interactionCreate"

    private static async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = RegisteredCommands.get(interaction.commandId)
        if (!command) {
            throw new CommandNotFoundByIdError(interaction.commandId)
        }

        if (!command.handleAutocomplete) {
            throw new NoAutocompleteHandlerError(command)
        }

        await interaction.respond(await command.handleAutocomplete(interaction))
    }

    private static async handleCommand(interaction: CommandInteraction): Promise<void> {
        const command = RegisteredCommands.get(interaction.commandId)
        if (!command) {
            throw new CommandNotFoundByIdError(interaction.commandId)
        }

        if (command.builder.default_member_permissions &&
            !interaction.memberPermissions?.has(BigInt(command.builder.default_member_permissions), true)) {
            throw new NoPermissionError()
        }

        await command.handle(interaction)
    }

    public async handle(interaction: Interaction): Promise<void> {
        if (interaction instanceof AutocompleteInteraction) {
            await CommandHandler.handleAutocomplete(interaction)
            return
        }

        if (interaction instanceof CommandInteraction) {
            await interaction.deferReply({ephemeral: !DefaultConfig.guild.privateChannels.includes(interaction.channelId)})
            try {
                await CommandHandler.handleCommand(interaction)
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                await reportError(interaction.client, e)
                await interaction.editReply({embeds: [makeErrorEmbed(e)]})
            }

            return
        }
    }
}