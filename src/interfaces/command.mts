import type { CustomId } from "../models/customId.mjs"
import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ContextMenuCommandBuilder,
  JSONEncodable,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Command<T>
  extends JSONEncodable<RESTPostAPIApplicationCommandsJSONBody> {
  builder: SlashCommandBuilder | ContextMenuCommandBuilder

  handle(interaction: T): Promise<void>

  handleMessageComponent?(
    interaction: MessageComponentInteraction,
    data: CustomId
  ): Promise<void>

  handleModalSubmit?(
    interaction: ModalSubmitInteraction,
    data: CustomId
  ): Promise<void>

  handleAutocomplete?(
    interaction: AutocompleteInteraction
  ): Promise<ApplicationCommandOptionChoiceData[]>
}
