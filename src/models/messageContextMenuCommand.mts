import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js"
import type { Command } from "../interfaces/command.mjs"

export abstract class MessageContextMenuCommand
  implements Command<MessageContextMenuCommandInteraction>
{
  public builder = new ContextMenuCommandBuilder()
  public handleAutocomplete = undefined

  protected constructor(name: string) {
    this.builder.setName(name)
  }

  public abstract handle(
    interaction: MessageContextMenuCommandInteraction
  ): Promise<void>

  public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
    return this.builder.toJSON()
  }
}
