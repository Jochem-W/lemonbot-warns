import type { Command } from "../types/command.mjs"
import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js"

export abstract class UserContextMenuCommand
  implements Command<UserContextMenuCommandInteraction>
{
  public readonly builder = new ContextMenuCommandBuilder()

  protected constructor(name: string, defaultMemberPermissions: bigint | null) {
    this.builder
      .setType(ApplicationCommandType.User)
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
