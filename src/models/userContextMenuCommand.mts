import type { Command } from "../interfaces/command.mjs"
import {
  ContextMenuCommandBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js"

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

  public toJSON() {
    return this.builder.toJSON()
  }
}
