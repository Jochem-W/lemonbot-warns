import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    ContextMenuCommandBuilder,
    JSONEncodable,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder,
} from "discord.js"
import {CustomId} from "../models/customId"

export interface Command<T> extends JSONEncodable<RESTPostAPIApplicationCommandsJSONBody> {
    builder: SlashCommandBuilder | ContextMenuCommandBuilder

    handleCommandInteraction(interaction: T): Promise<void>

    handleMessageComponent?(interaction: MessageComponentInteraction, data: CustomId): Promise<void>

    handleModalSubmit?(interaction: ModalSubmitInteraction, data: CustomId): Promise<void>

    handleAutocompleteInteraction?(interaction: AutocompleteInteraction): Promise<ApplicationCommandOptionChoiceData[]>
}

