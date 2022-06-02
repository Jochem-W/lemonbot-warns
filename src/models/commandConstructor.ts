import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    CommandInteraction,
    InteractionDeferReplyOptions,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    PermissionResolvable,
    RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js"
import {CustomId} from "./customId"

export default interface CommandConstructor<T extends CommandInteraction> {
    memberPermissions?: PermissionResolvable
    name: string

    execute(interaction: T, options?: InteractionDeferReplyOptions): Promise<void>

    build(): RESTPostAPIApplicationCommandsJSONBody

    getAutocomplete?(interaction: AutocompleteInteraction): Promise<ApplicationCommandOptionChoiceData[]>

    handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId): Promise<void>

    handleModalSubmit(interaction: ModalSubmitInteraction, data: CustomId): Promise<void>
}