import type { Command } from "../types/command.mjs"
import {
  ContextMenuCommandBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js"

export abstract class UserContextMenuCommand
  implements Command<UserContextMenuCommandInteraction>
{
  public builder = new ContextMenuCommandBuilder()
  public handleAutocomplete = undefined

  protected constructor(name: string, defaultMemberPermissions: bigint) {
    this.builder
      .setName(name)
      .setDefaultMemberPermissions(defaultMemberPermissions)
      .setDMPermission(false)
  }

  public abstract handle(
    interaction: UserContextMenuCommandInteraction
  ): Promise<void>

  public toJSON() {
    return this.builder.toJSON()
  }
}
