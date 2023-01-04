import {
  ContextMenuCommandBuilder,
  RESTPostAPIApplicationCommandsJSONBody,
  UserContextMenuCommandInteraction,
} from "discord.js"
import type { Command } from "../interfaces/command"

export abstract class UserContextMenuCommand
  implements Command<UserContextMenuCommandInteraction>
{
  public builder = new ContextMenuCommandBuilder()
  public handleAutocomplete = undefined

  protected constructor(name: string) {
    this.builder.setName(name)
  }

  public abstract handle(
    interaction: UserContextMenuCommandInteraction
  ): Promise<void>

  public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
    return this.builder.toJSON()
  }
}
