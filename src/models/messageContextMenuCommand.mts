import type { Command } from "../types/command.mjs"
import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js"

export abstract class MessageContextMenuCommand
  implements Command<MessageContextMenuCommandInteraction>
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
    interaction: MessageContextMenuCommandInteraction
  ): Promise<void>

  public toJSON() {
    return this.builder.toJSON()
  }
}
